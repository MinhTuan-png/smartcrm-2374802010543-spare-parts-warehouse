// BUG-002 (docs/bug-log.md): CSDL khởi động lại (docker compose restart db, PostgreSQL bị tắt) làm
// kết nối đang rảnh trong pool bị đóng; pool phát sự kiện 'error' mà không ai nghe nên cả tiến trình API sập.
// Ở đây giả lập bằng pg_terminate_backend (cùng mã lỗi 57P01 như khi tắt PostgreSQL).
const test = require('node:test');
const assert = require('node:assert/strict');
const { db, isReachable, BACKEND } = require('./helpers/test-db');

const { Client } = require(require.resolve('pg', { paths: [BACKEND] })); // pg nằm trong src/backend/node_modules

test('CSDL cắt kết nối đang rảnh: API không sập, truy vấn sau đó vẫn chạy', async (t) => {
  if (!(await isReachable())) return t.skip('không kết nối được CSDL test');

  await db.query('SELECT 1'); // để pool giữ một kết nối rảnh
  const admin = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  await admin.connect();
  const { rowCount } = await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()`
  );
  await admin.end();
  assert.ok(rowCount >= 1, 'phải cắt được ít nhất một kết nối của pool');

  await new Promise((r) => setTimeout(r, 300)); // chờ pool nhận thông báo cắt kết nối
  const { rows } = await db.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
});

test.after(() => db.pool.end());
