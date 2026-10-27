// GET /health: docker-compose dùng để biết API đã thật sự sẵn sàng (HEALTHCHECK, depends_on service_healthy).
const test = require('node:test');
const assert = require('node:assert/strict');
const { isReachable } = require('./helpers/test-db');
const http = require('./helpers/http');

test.before(http.start);
test.after(http.stop);

test('GET /health: CSDL trả lời thì 200 {status: ok}, không cần token', async (t) => {
  if (!(await isReachable())) return t.skip('không kết nối được CSDL test');
  const res = await http.call('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok', db: 'ok' });
});
