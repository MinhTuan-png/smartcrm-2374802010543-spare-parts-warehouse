// Điểm khởi động: chỉ nạp cấu hình và chạy server.
const path = require('path');
// .env ở thư mục gốc repo; trong container không có tệp này, biến môi trường do docker-compose truyền vào.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const app = require('./app'); // toàn bộ middleware và đường dẫn API nằm trong app.js
const { logger } = require('./logger');

const port = process.env.APP_PORT || 3000;
app.listen(port, () => logger.info('server đã chạy', { port: Number(port) }));
