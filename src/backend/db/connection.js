// Lớp 5: kết nối PostgreSQL. Cấu hình lấy từ .env ở thư mục gốc repo.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { Pool, types } = require('pg');
const { logger } = require('../logger');

// Cột DATE (oid 1082) giữ nguyên chuỗi 'YYYY-MM-DD'. Mặc định pg đổi sang Date lúc 00:00 giờ máy,
// khi chuyển sang JSON (UTC) ở múi giờ +07 sẽ lùi về ngày hôm trước.
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // CSDL không trả lời thì bỏ cuộc sau DB_CONNECT_TIMEOUT_MS (mặc định 5 giây), không chờ mãi (BUG-003).
  // Lỗi này đi lên error-handler và thành 503 có mã tra cứu.
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000,
});

// Kết nối ĐANG RẢNH bị CSDL cắt (PostgreSQL tắt hoặc khởi động lại, mã 57P01) thì pool phát 'error'.
// Không có hàm nghe sự kiện này, Node coi là lỗi không bắt và tắt cả tiến trình API (BUG-002).
// Pool tự bỏ kết nối hỏng và mở kết nối mới ở truy vấn sau, nên ở đây chỉ cần ghi log.
pool.on('error', (err) => logger.warn('CSDL đã đóng một kết nối đang rảnh', { err }));

/**
 * Chạy `fn(client)` trong MỘT giao dịch CSDL: lỗi ở bất kỳ bước nào thì ROLLBACK toàn bộ
 * (UC2 bước 7a, UC6 bước 5b: tồn không đổi khi lưu lỗi).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  withTransaction,
};
