// Log: một dòng JSON mỗi sự kiện, có thời điểm và ngữ cảnh, KHÔNG chứa mật khẩu/token (buổi 11).
// Mã tương quan: mỗi phản hồi có X-Request-Id; lỗi 500/503 dùng đúng mã này làm mã tra cứu.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const BACKEND = path.resolve(__dirname, '../src/backend');
const { createLogger, mask } = require(path.join(BACKEND, 'logger'));
const errorHandler = require(path.join(BACKEND, 'controllers/error-handler'));
const http = require('./helpers/http');

function capture(level = 'debug') {
  const lines = [];
  return { lines, logger: createLogger({ level, write: (s) => lines.push(s) }) };
}

test('log: mỗi dòng là một JSON có time (ISO), level, msg và ngữ cảnh', () => {
  const { lines, logger } = capture();
  logger.info('xuất kho', { requestId: 'ABC123', center_id: 2 });
  assert.equal(lines.length, 1);
  assert.ok(lines[0].endsWith('\n'));
  const row = JSON.parse(lines[0]);
  assert.match(row.time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual([row.level, row.msg, row.requestId, row.center_id], ['info', 'xuất kho', 'ABC123', 2]);
});

test('log: che mật khẩu, token, Authorization, chuỗi kết nối ở mọi tầng lồng nhau', () => {
  const masked = mask({
    username: 'ktv2', password: 'bí mật', headers: { Authorization: 'Bearer x.y.z' },
    body: { access_token: 'x.y.z', DATABASE_URL: 'postgres://u:p@db/smartcrm' }, so_dien_thoai: '0901234567',
  });
  assert.equal(masked.username, 'ktv2');
  assert.equal(masked.password, '***');
  assert.equal(masked.headers.Authorization, '***');
  assert.equal(masked.body.access_token, '***');
  assert.equal(masked.body.DATABASE_URL, '***');
  assert.equal(masked.so_dien_thoai, '***');
});

test('log: dưới mức LOG_LEVEL thì không ghi; Error ghi thành name, message, code, stack', () => {
  const { lines, logger } = capture('warn');
  logger.info('không ghi');
  const err = Object.assign(new Error('mất kết nối'), { code: 'ECONNREFUSED' });
  logger.error('lỗi hệ thống', { err });
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0]);
  assert.equal(row.err.message, 'mất kết nối');
  assert.equal(row.err.code, 'ECONNREFUSED');
  assert.ok(row.err.stack.includes('mất kết nối'));
});

test('lỗi không lường trước: trả 500 với mã tra cứu = requestId, không lộ thông điệp kỹ thuật', () => {
  const res = { statusCode: 0, json(b) { this.body = b; return this; }, status(c) { this.statusCode = c; return this; } };
  const req = { requestId: 'REQ123', method: 'GET', path: '/x' };
  errorHandler(new Error('relation "part_stock" does not exist'), req, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.equal(res.body.error.details.lookup_id, 'REQ123');
  assert.ok(!res.body.error.message.includes('part_stock'));
});

test.describe('mã tương quan X-Request-Id', () => {
  test.before(http.start);
  test.after(http.stop);

  test('tự sinh 6 ký tự khi bên gọi không gửi', async () => {
    const res = await fetch(`${http.base()}/api/v1/khong-co`);
    assert.match(res.headers.get('x-request-id'), /^[0-9A-F]{6}$/);
  });

  test('giữ mã hợp lệ bên gọi gửi, thay mã chứa ký tự lạ', async () => {
    const ok = await fetch(`${http.base()}/api/v1/khong-co`, { headers: { 'X-Request-Id': 'web-42' } });
    assert.equal(ok.headers.get('x-request-id'), 'web-42');
    const bad = await fetch(`${http.base()}/api/v1/khong-co`, { headers: { 'X-Request-Id': 'a b\tc' } });
    assert.match(bad.headers.get('x-request-id'), /^[0-9A-F]{6}$/);
  });
});

test('mất kết nối CSDL (ECONNREFUSED, 57P01): trả 503 thay vì 500, vẫn có mã tra cứu', () => {
  for (const code of ['ECONNREFUSED', '57P01']) {
    const res = { statusCode: 0, json(b) { this.body = b; return this; }, status(c) { this.statusCode = c; return this; } };
    errorHandler(Object.assign(new Error('x'), { code }), { requestId: 'R1', method: 'GET', path: '/' }, res, () => {});
    assert.equal(res.statusCode, 503, code);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.equal(res.body.error.details.lookup_id, 'R1');
  }
});
