// Test hồi quy của Bài tập 3: đầu vào bất thường phải bị từ chối bằng 4xx có định dạng lỗi chung,
// không được thành 500 "lỗi hệ thống" (BUG-004 đến BUG-006 trong docs/bug-log.md) và không để lộ
// thông tin cấu hình (BUG-008). Cần PostgreSQL như các test API khác; không kết nối được thì bỏ qua.
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
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

// Gọi thẳng fetch khi cần gửi thứ mà call() không gửi được (thân quá lớn, mã hoá sai, đường dẫn hỏng).
const raw = async (method, url, { token, headers = {}, body } = {}) => {
  const res = await fetch(http.base() + url, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: res.status, headers: res.headers, text, body: json };
};

const fieldsOf = (r) => (r.body.error.details || []).map((d) => d.field);

// ---- BUG-004: số trang vượt giới hạn gây lỗi tràn số ở CSDL ----
it('BUG-004: page = 99999999999999999999 → 400 nêu rõ trường page, không phải 500', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock?page=99999999999999999999', { token: technician() });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION_FAILED');
  assert.deepEqual(fieldsOf(r), ['page']);
});

it('BUG-004: trang lớn nhưng hợp lệ (999999) → 200 với items rỗng, không phải lỗi', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock?page=999999', { token: technician() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items, []);
});

// ---- BUG-005: ký tự NUL (\u0000) trong chuỗi mà PostgreSQL không nhận ----
it('BUG-005: tên đăng nhập chứa ký tự NUL → 400 nêu rõ trường username', async () => {
  const r = await call('POST', '/api/v1/auth/login', { body: { username: 'ktv2\u0000x', password: 'bat-ky' } });
  assert.equal(r.status, 400);
  assert.deepEqual(fieldsOf(r), ['username']);
});

it('BUG-005: từ khoá tìm kiếm q chứa NUL (%00) → 400 nêu rõ trường q', async () => {
  const r = await call('GET', '/api/v1/centers/2/stock?q=%00', { token: technician() });
  assert.equal(r.status, 400);
  assert.deepEqual(fieldsOf(r), ['q']);
});

it('BUG-005: tên linh kiện chứa NUL khi tạo → 400, danh mục không đổi', async () => {
  const r = await call('POST', '/api/v1/parts', {
    token: manager(), body: { part_code: 'TEST-NUL-01', part_name: 'Pin\u0000lạ', unit_price: 1000 },
  });
  assert.equal(r.status, 400);
  assert.deepEqual(fieldsOf(r), ['part_name']);
  const n = await testDb.db.query("SELECT COUNT(*)::int AS n FROM part WHERE part_code = 'TEST-NUL-01'");
  assert.equal(n.rows[0].n, 0);
});

// ---- BUG-006: yêu cầu HTTP hỏng bị báo thành lỗi hệ thống 500 ----
it('BUG-006: thân yêu cầu quá lớn (200 KB) → 413 PAYLOAD_TOO_LARGE, không phải 500', async () => {
  const body = JSON.stringify({ username: 'a'.repeat(200 * 1024), password: 'x' });
  const r = await raw('POST', '/api/v1/auth/login', { headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(r.status, 413);
  assert.equal(r.body.error.code, 'PAYLOAD_TOO_LARGE');
});

it('BUG-006: đường dẫn mã hoá hỏng (%E0%A4%A) → 400, không phải 500', async () => {
  const r = await raw('GET', '/api/v1/tickets/%E0%A4%A', { token: technician() });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION_FAILED');
});

it('BUG-006: thân nén gzip có byte thừa phía sau → 400, không phải 500', async () => {
  const good = zlib.gzipSync(JSON.stringify({ username: 'ktv2', password: 'x' }));
  const body = Buffer.concat([good, Buffer.from('BYTE-THUA')]);
  const r = await raw('POST', '/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION_FAILED');
});

it('BUG-006: phản hồi lỗi không lộ vết ngăn xếp, tên bảng hay đường dẫn tệp', async () => {
  const r = await raw('GET', '/api/v1/tickets/%E0%A4%A', { token: technician() });
  assert.doesNotMatch(r.text, /node_modules|\.js:\d+|\bat\s+\S+\s+\(|part_stock|pg-pool/);
});

// ---- BUG-008: tiêu đề phản hồi lộ công nghệ máy chủ ----
it('BUG-008: phản hồi không có tiêu đề X-Powered-By', async () => {
  const r = await raw('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-powered-by'), null);
});
