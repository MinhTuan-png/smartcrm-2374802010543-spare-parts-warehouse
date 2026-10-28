// Test tích hợp CRUD dòng tồn /api/v1/centers/{id}/stock (tiêu chí S1, TD-21): tạo, ngừng dùng,
// cùng với đọc (EP1) và sửa ngưỡng (EP6) đã có. "Xoá" là ngừng dùng (QT-13), sổ giao dịch giữ nguyên.
// Cần PostgreSQL như tests/stock.api.test.js; không kết nối được thì BỎ QUA.
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

const NEW_PART = { part_code: 'PIN-NK-01', part_name: 'Pin Nokia loại 1', unit_price: 350000 };

it('[luồng đúng] dòng tồn: tạo (tồn 0) → nhập kho → sửa ngưỡng → xuất hết → xoá → không còn trong tra cứu', async () => {
  await call('POST', '/api/v1/parts', { token: manager(), body: NEW_PART });

  const created = await call('POST', '/api/v1/centers/2/stock', {
    token: manager(), body: { part_code: 'PIN-NK-01', min_threshold: 2 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.quantity, 0);
  assert.equal(created.body.warning_label, 'HẾT HÀNG');

  const imp = await call('POST', '/api/v1/centers/2/stock/imports', {
    token: manager(), body: { part_code: 'PIN-NK-01', quantity: 3 },
  });
  assert.equal(imp.status, 201);
  const thr = await call('PATCH', '/api/v1/centers/2/stock/PIN-NK-01/threshold', {
    token: manager(), body: { min_threshold: 1 },
  });
  assert.equal(thr.body.min_threshold, 1);

  // Còn 3 cái → chưa xoá được
  const early = await call('DELETE', '/api/v1/centers/2/stock/PIN-NK-01', { token: manager() });
  assert.equal(early.status, 409);
  assert.equal(early.body.error.code, 'STOCK_NOT_EMPTY');
  assert.equal(early.body.error.details.quantity, 3);

  await call('POST', '/api/v1/centers/2/stock/exports', {
    token: technician(), body: { ticket_code: 'BH-000002/2025', part_code: 'PIN-NK-01', quantity: 3 },
  });
  const del = await call('DELETE', '/api/v1/centers/2/stock/PIN-NK-01', { token: manager() });
  assert.equal(del.status, 204);

  const list = await call('GET', '/api/v1/centers/2/stock?q=nokia', { token: manager() });
  assert.deepEqual(list.body.items, []);
  assert.equal((await call('GET', '/api/v1/centers/2/stock/PIN-NK-01', { token: manager() })).status, 404);
  // Sổ giao dịch giữ nguyên 2 dòng (QT-13, QT-L5-01)
  assert.equal(await testDb.countTransactions('NHAP'), 1);
  assert.equal(await testDb.countTransactions('XUAT'), 1);
});

it('[dữ liệu sai] dòng tồn: tạo trùng → 409; linh kiện không có trong danh mục → 404; ngưỡng âm → 400', async () => {
  const dup = await call('POST', '/api/v1/centers/2/stock', { token: manager(), body: { part_code: 'PIN-OP-03', min_threshold: 1 } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'ALREADY_EXISTS');
  const missing = await call('POST', '/api/v1/centers/2/stock', { token: manager(), body: { part_code: 'KHONG-CO-01', min_threshold: 1 } });
  assert.equal(missing.status, 404);
  const bad = await call('POST', '/api/v1/centers/2/stock', { token: manager(), body: { part_code: 'PIN-OP-03', min_threshold: -1 } });
  assert.equal(bad.status, 400);
});

it('[phân quyền] dòng tồn: kỹ thuật viên tạo/xoá → 403; quản lý trung tâm 2 xoá ở trung tâm 3 → 403 (QT-14)', async () => {
  const body = { part_code: 'CAM-AP-01', min_threshold: 1 };
  assert.equal((await call('POST', '/api/v1/centers/2/stock', { token: technician(), body })).status, 403);
  assert.equal((await call('DELETE', '/api/v1/centers/2/stock/CAM-AP-01', { token: technician() })).status, 403);
  assert.equal((await call('DELETE', '/api/v1/centers/3/stock/PIN-OP-03', { token: manager(2) })).status, 403);
});

it('[luồng đúng] dòng tồn đã ngừng dùng: nhập kho bị 404, tạo lại thì dùng lại dòng cũ với ngưỡng mới', async () => {
  assert.equal((await call('DELETE', '/api/v1/centers/2/stock/CAM-AP-01', { token: manager() })).status, 204);
  const imp = await call('POST', '/api/v1/centers/2/stock/imports', { token: manager(), body: { part_code: 'CAM-AP-01', quantity: 1 } });
  assert.equal(imp.status, 404);
  const again = await call('POST', '/api/v1/centers/2/stock', { token: manager(), body: { part_code: 'CAM-AP-01', min_threshold: 4 } });
  assert.equal(again.status, 201);
  assert.equal(again.body.min_threshold, 4);
  assert.equal(again.body.quantity, 0);
});