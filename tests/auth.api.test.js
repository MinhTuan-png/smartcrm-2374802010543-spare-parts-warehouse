// Test đăng nhập (POST /api/v1/auth/login) chạy thật trên CSDL test.
const test = require('node:test');
const assert = require('node:assert/strict');
const testDb = require('./helpers/test-db');
const http = require('./helpers/http');

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

it('[luồng đúng] đăng nhập đúng nhận token dùng được để gọi API của trung tâm mình', async () => {
  const r = await http.call('POST', '/api/v1/auth/login', { body: { username: 'ktv2', password: testDb.TEST_PASSWORD } });
  assert.equal(r.status, 200);
  assert.equal(r.body.role, 'TECHNICIAN');
  assert.equal(r.body.center_id, 2);
  assert.equal(r.body.center_code, 'HCM02');
  const stock = await http.call('GET', '/api/v1/centers/2/stock', { token: r.body.access_token });
  assert.equal(stock.status, 200);
});

it('[dữ liệu sai] sai mật khẩu và sai tên đăng nhập trả CÙNG một lỗi 401', async () => {
  const wrongPass = await http.call('POST', '/api/v1/auth/login', { body: { username: 'ktv2', password: 'sai' } });
  const noUser = await http.call('POST', '/api/v1/auth/login', { body: { username: 'khongco', password: 'sai' } });
  assert.equal(wrongPass.status, 401);
  assert.deepEqual(wrongPass.body, noUser.body); // không lộ tên đăng nhập nào có thật
});

it('[dữ liệu sai] thiếu mật khẩu → 400 kèm tên trường', async () => {
  const r = await http.call('POST', '/api/v1/auth/login', { body: { username: 'ktv2' } });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.error.details, [{ field: 'password', reason: 'Bắt buộc.' }]);
});
