// Test tích hợp toàn luồng API → controller → service → repository → PostgreSQL.
// Cần PostgreSQL và một CSDL test trống (mặc định smartcrm_test, đổi bằng TEST_DB_NAME);
// không kết nối được thì các test này được BỎ QUA (skip) chứ không báo lỗi.
const test = require('node:test');
const assert = require('node:assert/strict');
const testDb = require('./helpers/test-db');
const http = require('./helpers/http');

const { call, technician, manager } = http;
let ready = false;

test.before(async () => {
  ready = await testDb.isReachable();
  if (ready) await http.start();
});
test.after(async () => {
  if (ready) await http.stop();
  await testDb.db.pool.end();
});

// Mỗi test bắt đầu từ dữ liệu mẫu sạch.
const it = (name, fn) => test(name, async (t) => {
  if (!ready) return t.skip(`Không kết nối được CSDL ${process.env.DB_NAME}`);
  await testDb.reset();
  await fn(t);
});

const EXPORT = (part_code, quantity, ticket_code = 'BH-000002/2025') => ({ ticket_code, part_code, quantity });

it('EP1: tìm "pin" ở trung tâm 2 trả đúng hình dạng hợp đồng', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock?q=pin', { token: technician() });
  assert.equal(r.status, 200);
  assert.equal(r.body.total_items, 2);
  assert.equal(r.body.total_pages, 1);
  assert.deepEqual(r.body.items.map((i) => i.part_code), ['PIN-OP-02', 'PIN-OP-03']);
  assert.equal(r.body.items[0].warning_label, 'SẮP HẾT');
  assert.equal(r.body.low_stock_count, 1); // PIN-OP-02 (7 < 8)
});

it('EP1: không có dòng nào khớp là 200 với items rỗng, không phải 404', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock?q=khongcogi', { token: manager() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items, []);
  assert.equal(r.body.total_pages, 0);
});

it('EP2 [luồng đúng]: tồn 10 xuất 2 còn 8, có 1 giao dịch XUAT gắn mã phiếu (US2 tiêu chí 1)', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/exports', { token: technician(), body: EXPORT('PIN-OP-03', 2) });
  assert.equal(r.status, 201);
  assert.equal(r.body.stock.quantity, 8);
  assert.equal(r.body.transaction.type, 'XUAT');
  assert.equal(r.body.transaction.ticket_code, 'BH-000002/2025');
  assert.match(r.body.transaction.transaction_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(await testDb.quantityOf(2, 'PIN-OP-03'), 8);
  assert.equal(await testDb.countTransactions('XUAT'), 1);
});

it('EP2: ngưỡng 5, tồn 6, xuất 2 → có cảnh báo và xuất hiện trong danh sách sắp hết (US4 tiêu chí 1)', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/exports', { token: technician(), body: EXPORT('CS-AP-02', 2, 'BH-000003/2025') });
  assert.equal(r.status, 201);
  assert.equal(r.body.low_stock_warning, true);
  assert.equal(r.body.warning_label, 'SẮP HẾT');
  const low = await call('GET', '/api/v1/centers/2/stock/low', { token: manager() });
  assert.ok(low.body.items.some((i) => i.part_code === 'CS-AP-02'));
});

it('EP2 409: tồn 1 xuất 2 → INSUFFICIENT_STOCK kèm tồn hiện có, tồn vẫn 1 (US2 tiêu chí 2)', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/exports', { token: technician(), body: EXPORT('MH-AP-03', 2) });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'INSUFFICIENT_STOCK');
  assert.deepEqual(r.body.error.details, {
    part_code: 'MH-AP-03', requested_quantity: 2, available_quantity: 1, ticket_status: 'Đang xử lý',
  });
  assert.equal(await testDb.quantityOf(2, 'MH-AP-03'), 1);
  assert.equal(await testDb.countTransactions('XUAT'), 0);
});

it('EP2 422: phiếu "Đã phân công" → TICKET_STATE_INVALID, tồn không đổi (US2 tiêu chí 3)', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/exports', { token: technician(), body: EXPORT('PIN-OP-03', 1, 'BH-000009/2026') });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'TICKET_STATE_INVALID');
  assert.equal(r.body.error.details.current_status, 'Đã phân công');
  assert.equal(await testDb.quantityOf(2, 'PIN-OP-03'), 10);
});

it('EP2 404/403: phiếu không có, linh kiện không có dòng tồn, phiếu của trung tâm khác', async () => {
  const token = technician();
  const noTicket = await call('POST', '/api/v1/centers/2/stock/exports', { token, body: EXPORT('PIN-OP-03', 1, 'BH-999999/2026') });
  assert.equal(noTicket.status, 404);
  const noStock = await call('POST', '/api/v1/centers/2/stock/exports', { token, body: EXPORT('XX-YY-99', 1) });
  assert.equal(noStock.status, 404);
  const otherCenter = await call('POST', '/api/v1/centers/2/stock/exports', { token, body: EXPORT('PIN-OP-03', 1, 'BH-000100/2026') });
  assert.equal(otherCenter.status, 403);
  assert.doesNotMatch(otherCenter.body.error.message, /3/); // không lộ trung tâm của phiếu
});

it('EP2 400: quantity = 0 trả danh sách trường sai theo hợp đồng', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/exports', { token: technician(), body: EXPORT('PIN-OP-03', 0) });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body, { error: {
    code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ.',
    details: [{ field: 'quantity', reason: 'Phải là số nguyên từ 1 đến 9999.' }],
  } });
});

it('EP3: tồn 1 nhập 20 → 21, giao dịch NHAP không có mã phiếu (US3 tiêu chí 1)', async () => {
  const r = await call('POST', '/api/v1/centers/2/stock/imports', { token: manager(), body: { part_code: 'LOA-AP-01', quantity: 20 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.stock.quantity, 21);
  assert.equal(r.body.transaction.type, 'NHAP');
  assert.equal(r.body.transaction.ticket_code, null);
  assert.equal(r.body.low_stock_warning, false);
});

it('EP4: xếp theo mức thiếu giảm dần, cùng mức thì theo mã; tồn = ngưỡng không xuất hiện', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock/low', { token: technician() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items.map((i) => [i.part_code, i.shortage]), [
    ['CAM-AP-01', 8], ['LOA-AP-01', 7], ['MH-AP-03', 7], ['PIN-OP-02', 1],
  ]);
  assert.equal(r.body.total_items, 4);
  assert.equal(r.body.out_of_stock_count, 1);
  assert.ok(!r.body.items.some((i) => i.part_code === 'LOA-SS-01')); // 5/5
});

it('EP6: đặt ngưỡng 10 cho LOA-SS-01 (tồn 5) → SẮP HẾT', async () => {
  const r = await call('PATCH', '/api/v1/centers/2/stock/LOA-SS-01/threshold', { token: manager(), body: { min_threshold: 10 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.min_threshold, 10);
  assert.equal(r.body.warning_label, 'SẮP HẾT');
});

it('NFR3: 20 yêu cầu xuất 1 đồng thời trên tồn 10 → đúng 10 thành công, 10 bị 409, tồn cuối 0', async () => {
  const token = technician();
  const results = await Promise.all(Array.from({ length: 20 }, () =>
    call('POST', '/api/v1/centers/2/stock/exports', { token, body: EXPORT('PIN-OP-03', 1) })));
  const statuses = results.map((r) => r.status);
  assert.equal(statuses.filter((s) => s === 201).length, 10);
  assert.equal(statuses.filter((s) => s === 409).length, 10);
  assert.equal(await testDb.quantityOf(2, 'PIN-OP-03'), 0);
  assert.equal(await testDb.countTransactions('XUAT'), 10);
});

it('NFR5: 100% yêu cầu sai trung tâm hoặc sai vai trò bị 403, dữ liệu không đổi', async () => {
  const cases = [
    // sai trung tâm, cả hai vai trò, mọi endpoint
    ['GET', '/api/v1/centers/3/stock', technician()],
    ['GET', '/api/v1/centers/3/stock/low', manager()],
    ['POST', '/api/v1/centers/3/stock/exports', technician(), EXPORT('PIN-OP-03', 1, 'BH-000100/2026')],
    ['POST', '/api/v1/centers/3/stock/imports', manager(), { part_code: 'PIN-OP-03', quantity: 1 }],
    ['PATCH', '/api/v1/centers/3/stock/PIN-OP-03/threshold', manager(), { min_threshold: 1 }],
    ['GET', '/api/v1/centers/999/stock', manager()], // trung tâm không tồn tại vẫn 403, không phải 404
    // sai vai trò
    ['POST', '/api/v1/centers/2/stock/exports', manager(), EXPORT('PIN-OP-03', 1)],
    ['POST', '/api/v1/centers/2/stock/imports', technician(), { part_code: 'LOA-AP-01', quantity: 20 }],
    ['PATCH', '/api/v1/centers/2/stock/LOA-SS-01/threshold', technician(), { min_threshold: 10 }],
  ];
  for (const [method, url, token, body] of cases) {
    const r = await call(method, url, { token, body });
    assert.equal(r.status, 403, `${method} ${url}`);
    assert.equal(r.body.error.code, 'FORBIDDEN');
  }
  assert.equal(await testDb.quantityOf(3, 'PIN-OP-03'), 4);
  assert.equal(await testDb.quantityOf(2, 'PIN-OP-03'), 10);
  assert.equal(await testDb.countTransactions('XUAT') + await testDb.countTransactions('NHAP'), 0);
});

it('401: không có token → UNAUTHORIZED trước mọi kiểm tra khác', async () => {
  const r = await call('POST', '/api/v1/centers/abc/stock/exports', { body: {} });
  assert.equal(r.status, 401);
  assert.equal(r.body.error.code, 'UNAUTHORIZED');
});
