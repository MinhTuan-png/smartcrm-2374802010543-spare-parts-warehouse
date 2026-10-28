// Test tích hợp CRUD danh mục linh kiện /api/v1/parts (tiêu chí S1, TD-21).
// "Xoá" là ngừng dùng (QT-13): kiểm cả việc dòng vẫn còn trong CSDL.
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
const rowOf = async (partCode) =>
  (await testDb.db.query('SELECT is_active FROM part WHERE part_code = $1', [partCode])).rows[0];


it('[luồng đúng] linh kiện: tạo → đọc → sửa → xoá (ngừng dùng) → đọc lại 404, dòng vẫn còn trong CSDL', async () => {
  const created = await call('POST', '/api/v1/parts', { token: manager(), body: NEW_PART });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, NEW_PART);

  const read = await call('GET', '/api/v1/parts/PIN-NK-01', { token: technician() });
  assert.equal(read.status, 200);
  assert.equal(read.body.part_name, 'Pin Nokia loại 1');

  const updated = await call('PATCH', '/api/v1/parts/PIN-NK-01', { token: manager(), body: { unit_price: 390000 } });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body, { ...NEW_PART, unit_price: 390000 });

  const del = await call('DELETE', '/api/v1/parts/PIN-NK-01', { token: manager() });
  assert.equal(del.status, 204);
  assert.equal((await call('GET', '/api/v1/parts/PIN-NK-01', { token: manager() })).status, 404);
  assert.deepEqual(await rowOf('PIN-NK-01'), { is_active: false }); // QT-13: không xoá vật lý
});

it('[luồng đúng] linh kiện: danh sách lọc theo q, phân trang, không có linh kiện đã ngừng dùng', async () => {
  await call('DELETE', '/api/v1/parts/CAM-AP-01', { token: manager() }); // tồn 0 ở mọi trung tâm
  const r = await call('GET', '/api/v1/parts?q=ap', { token: technician() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items.map((i) => i.part_code), ['CS-AP-02', 'LOA-AP-01', 'MH-AP-03']);
  assert.equal(r.body.total_items, 3);
  assert.equal(r.body.page_size, 20);
});

it('[dữ liệu sai] linh kiện: tạo trùng mã → 409 ALREADY_EXISTS; dữ liệu sai → 400; không có → 404', async () => {
  const dup = await call('POST', '/api/v1/parts', { token: manager(), body: { ...NEW_PART, part_code: 'PIN-OP-03' } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'ALREADY_EXISTS');

  const bad = await call('POST', '/api/v1/parts', { token: manager(), body: { ...NEW_PART, unit_price: -5 } });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body.error.details.map((d) => d.field), ['unit_price']);

  const missing = await call('PATCH', '/api/v1/parts/KHONG-CO-01', { token: manager(), body: { part_name: 'X' } });
  assert.equal(missing.status, 404);
});

it('[dữ liệu sai] linh kiện còn tồn ở một trung tâm → xoá bị 409 STOCK_NOT_EMPTY, vẫn đang dùng', async () => {
  const r = await call('DELETE', '/api/v1/parts/PIN-OP-03', { token: manager() });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'STOCK_NOT_EMPTY');
  assert.equal(r.body.error.details.centers_with_stock, 2); // trung tâm 2 (10 cái) và 3 (4 cái)
  assert.deepEqual(await rowOf('PIN-OP-03'), { is_active: true });
});

it('[phân quyền] kỹ thuật viên chỉ đọc danh mục: tạo, sửa, xoá → 403; không token → 401', async () => {
  for (const [method, url, body] of [
    ['POST', '/api/v1/parts', NEW_PART],
    ['PATCH', '/api/v1/parts/PIN-OP-03', { unit_price: 1 }],
    ['DELETE', '/api/v1/parts/CAM-AP-01'],
  ]) {
    assert.equal((await call(method, url, { token: technician(), body })).status, 403, `${method} ${url}`);
  }
  assert.equal((await call('GET', '/api/v1/parts')).status, 401);
});

it('[luồng đúng] linh kiện đã ngừng dùng được tạo lại bằng cùng mã, giữ part_id cũ', async () => {
  const before = await testDb.db.query("SELECT part_id FROM part WHERE part_code = 'CAM-AP-01'");
  await call('DELETE', '/api/v1/parts/CAM-AP-01', { token: manager() });
  const again = await call('POST', '/api/v1/parts', {
    token: manager(), body: { part_code: 'CAM-AP-01', part_name: 'Camera sau Apple loại 1 (mới)', unit_price: 950000 },
  });
  assert.equal(again.status, 201);
  const after = await testDb.db.query("SELECT part_id FROM part WHERE part_code = 'CAM-AP-01'");
  assert.equal(after.rows[0].part_id, before.rows[0].part_id);
});