// BUG-003 (docs/bug-log.md): CSDL nhận kết nối nhưng không trả lời (máy CSDL treo, mạng chập chờn,
// container db bị tạm dừng) thì yêu cầu API chờ mãi, giao diện quay "Đang tải..." không dừng.
// Mong muốn: hết DB_CONNECT_TIMEOUT_MS thì trả 503 INTERNAL_ERROR có mã tra cứu, người dùng bấm Thử lại được.
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');

let silent;
const sockets = new Set();
let http;

test.before(async () => {
  // Máy "CSDL" giả: nhận kết nối TCP rồi im lặng, không bao giờ trả lời.
  silent = net.createServer((s) => { sockets.add(s); s.on('error', () => {}); });
  await new Promise((r) => silent.listen(0, '127.0.0.1', r));
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(silent.address().port);
  process.env.DB_CONNECT_TIMEOUT_MS = '500';
  http = require('./helpers/http'); // nạp sau khi đặt biến môi trường: pool đọc cấu hình lúc nạp
  await http.start();
});

test.after(async () => {
  sockets.forEach((s) => s.destroy());
  silent.close();
  await http.stop();
});

test('CSDL không trả lời: API trả 503 trong vài giây, không treo', { timeout: 10000 }, async () => {
  const t0 = Date.now();
  const res = await fetch(`${http.base()}/api/v1/centers/2/stock`, {
    headers: { Authorization: `Bearer ${http.technician()}` },
    signal: AbortSignal.timeout(4000), // trước khi sửa: hết 4 giây vẫn chưa có phản hồi
  });
  const body = await res.json();
  assert.equal(res.status, 503);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(body.error.details.lookup_id, res.headers.get('x-request-id'));
  assert.ok(Date.now() - t0 < 3000, `mất ${Date.now() - t0} ms`);
});
