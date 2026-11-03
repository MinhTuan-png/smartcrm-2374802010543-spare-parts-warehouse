// Tạo CSDL test (mặc định smartcrm_test) nếu chưa có. Dùng cho `docker compose --profile test run --rm test`,
// nơi máy chỉ có Docker nên không ai tạo tay CSDL test như hướng dẫn ở README mục 3.4.
// Kết nối vào CSDL mặc định "postgres" bằng chính DB_USER/DB_PASSWORD (trong Docker là siêu người dùng).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { Client } = require('pg');

const name = process.env.TEST_DB_NAME || 'smartcrm_test';
// Tên được ghép vào câu CREATE DATABASE (không tham số hoá được), nên chỉ nhận chữ, số, gạch dưới và phải kết thúc bằng _test.
if (!/^[a-z][a-z0-9_]*_test$/.test(name)) {
  console.error(`Tên CSDL test "${name}" không hợp lệ: chỉ chữ thường, số, gạch dưới và phải kết thúc bằng _test.`);
  process.exit(1);
}

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();
  const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (found.rowCount === 0) {
    await client.query(`CREATE DATABASE ${name}`);
    console.log(`Đã tạo CSDL test ${name}.`);
  } else {
    console.log(`CSDL test ${name} đã có.`);
  }
  await client.end();
})().catch((err) => {
  console.error('Không tạo được CSDL test:', err.message);
  process.exit(1);
});
