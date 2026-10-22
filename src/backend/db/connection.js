// Lớp 5: kết nối PostgreSQL. Cấu hình lấy từ .env ở thư mục gốc repo.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { Pool, types } = require('pg');

// Cột DATE (oid 1082) giữ nguyên chuỗi 'YYYY-MM-DD'. Mặc định pg đổi sang Date lúc 00:00 giờ máy,
// khi chuyển sang JSON (UTC) ở múi giờ +07 sẽ lùi về ngày hôm trước.
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

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
