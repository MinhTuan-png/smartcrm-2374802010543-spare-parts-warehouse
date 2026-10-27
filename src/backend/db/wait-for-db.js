// Chờ CSDL sẵn sàng trước khi migrate/seed/chạy server (dùng khi khởi động trong container).
// Thử SELECT 1; thất bại thì chờ DB_WAIT_INTERVAL_MS (mặc định 2 giây) rồi thử lại, tối đa DB_WAIT_RETRIES lần (15).
// Lớp bảo vệ thứ hai bên cạnh healthcheck + depends_on: service_healthy của docker-compose.
const { pool } = require('./connection');
const { logger } = require('../logger');

const RETRIES = Number(process.env.DB_WAIT_RETRIES) || 15;
const INTERVAL_MS = Number(process.env.DB_WAIT_INTERVAL_MS) || 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      logger.info('CSDL đã sẵn sàng', { attempt });
      await pool.end();
      return;
    } catch (err) {
      logger.warn('CSDL chưa sẵn sàng, thử lại', { attempt, retries: RETRIES, code: err.code, reason: err.message });
      await sleep(INTERVAL_MS);
    }
  }
  logger.error('Hết số lần thử, không kết nối được CSDL. Kiểm tra DB_HOST, DB_USER, DB_PASSWORD.', { retries: RETRIES });
  process.exit(1);
})();
