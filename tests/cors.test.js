// BUG-001 (docs/bug-log.md): Vite tự chuyển sang cổng 5174 khi 5173 bận, giao diện bị trình duyệt chặn CORS.
// CORS_ORIGIN nhận nhiều nguồn cách nhau bằng dấu phẩy; nguồn không khai báo thì không được phép.
process.env.CORS_ORIGIN = 'http://localhost:5173, http://localhost:5174';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('./helpers/http');

test.before(http.start);
test.after(http.stop);

const preflight = (origin) => fetch(`${http.base()}/api/v1/auth/login`, {
  method: 'OPTIONS',
  headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
});

test('CORS: cả hai nguồn khai báo (5173 và 5174) đều được phép', async () => {
  for (const origin of ['http://localhost:5173', 'http://localhost:5174']) {
    const res = await preflight(origin);
    assert.equal(res.status, 204, origin);
    assert.equal(res.headers.get('access-control-allow-origin'), origin);
  }
});

test('CORS: nguồn không khai báo không nhận header cho phép', async () => {
  const res = await preflight('http://evil.example');
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});
