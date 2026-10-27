// Chạy lần lượt các file .sql trong migrations/ (theo tên). An toàn khi chạy lại nhờ IF NOT EXISTS.
const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');
const { logger } = require('../logger');

(async () => {
  const dir = path.join(__dirname, 'migrations');
  // Sắp theo tên (001, 002, 003...) để bảng được tham chiếu luôn tạo trước bảng tham chiếu tới nó.
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await pool.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    logger.info('migration đã chạy', { file: f });
  }
  await pool.end(); // đóng kết nối để lệnh npm run migrate tự kết thúc
})().catch((err) => {
  logger.error('migration lỗi', { err });
  process.exit(1);
});
