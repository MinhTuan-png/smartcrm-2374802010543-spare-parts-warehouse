// Test tích hợp cho Màn hình 2: tra cứu phiếu (EP-L2) và linh kiện đã dùng của phiếu (EP8, UC10).
// Cần PostgreSQL như stock.api.test.js; không kết nối được thì bỏ qua.
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

const it = (name, fn) => test(name, async (t) => {
  if (!ready) return t.skip(`Không kết nối được CSDL ${process.env.DB_NAME}`);
  await testDb.reset();
  await fn(t);
});

// Mã phiếu có dấu "/" nên phải mã hoá khi đặt trên đường dẫn.
const url = (code, suffix = '') => `/api/v1/tickets/${encodeURIComponent(code)}${suffix}`;
const exportPart = (part_code, quantity) => call('POST', '/api/v1/centers/2/stock/exports', {
  token: technician(), body: { ticket_code: 'BH-000002/2025', part_code, quantity },
});

it('Tra cứu phiếu: trả trạng thái có dấu, mô tả lỗi và có xuất được hay không', async () => {
  const r = await call('GET', url('BH-000002/2025'), { token: technician() });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'Đang xử lý');
  assert.equal(r.body.exportable, true);
  assert.equal(typeof r.body.issue_desc, 'string');
});

it('Tra cứu phiếu: phiếu của trung tâm khác → 403, phiếu không có → 404, sai định dạng → 400', async () => {
  assert.equal((await call('GET', url('BH-000100/2026'), { token: technician() })).status, 403);
  assert.equal((await call('GET', url('BH-999999/2026'), { token: technician() })).status, 404);
  const bad = await call('GET', url('BH-2'), { token: technician() });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.details[0].field, 'ticket_code');
});

it('EP8: phiếu chưa xuất linh kiện nào trả items rỗng và tổng cộng 0 (US7 tiêu chí 2)', async () => {
  const r = await call('GET', url('BH-000002/2025', '/used-parts'), { token: manager() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items, []);
  assert.equal(r.body.total_amount, 0);
});

it('EP8: thành tiền = số lượng × đơn giá, tổng cộng đúng (US7 tiêu chí 1)', async () => {
  await exportPart('PIN-OP-03', 2); // 2 × 650.000
  await exportPart('CS-AP-02', 1);  // 1 × 120.000
  const r = await call('GET', url('BH-000002/2025', '/used-parts'), { token: technician() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items.map((i) => [i.part_code, i.quantity, i.line_total]),
    [['PIN-OP-03', 2, 1300000], ['CS-AP-02', 1, 120000]]);
  assert.equal(r.body.total_amount, 1420000);
});

it('EP8: phiếu của trung tâm khác bị từ chối, không lộ dữ liệu (QT-14)', async () => {
  const r = await call('GET', url('BH-000100/2026', '/used-parts'), { token: technician() });
  assert.equal(r.status, 403);
  assert.equal(r.body.items, undefined);
});

it('Không có token → 401', async () => {
  assert.equal((await call('GET', url('BH-000002/2025'))).status, 401);
});
