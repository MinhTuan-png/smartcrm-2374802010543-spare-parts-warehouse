// Chạy app trên một cổng ngẫu nhiên và gọi bằng fetch, giống cách giao diện gọi API thật.
const path = require('path');
const { BACKEND } = require('./test-db');

const app = require(path.join(BACKEND, 'app'));
const { signToken } = require(path.join(BACKEND, 'controllers/auth'));

let server;
let base;

async function start() {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
const stop = () => new Promise((r) => server.close(r));

const technician = (centerId = 2) => signToken({ userId: 11, role: 'TECHNICIAN', centerId });
const manager = (centerId = 2) => signToken({ userId: 21, role: 'MANAGER', centerId });

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // 204 (xoá) không có nội dung: body = null
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

module.exports = { start, stop, call, technician, manager, base: () => base };