// Chạy lần lượt các file .sql trong migrations/ (theo tên). An toàn khi chạy lại nhờ IF NOT EXISTS.
const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

(async () => {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await pool.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log('OK', f);
  }
  await pool.end();
})().catch((e) => {
  console.error('Migration lỗi:', e.message);
  process.exit(1);
});
