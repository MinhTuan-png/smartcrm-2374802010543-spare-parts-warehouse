// Điểm khởi động: chỉ nạp cấu hình và chạy server.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // .env ở thư mục gốc repo

const app = require('./app'); // toàn bộ middleware và đường dẫn API nằm trong app.js

const port = process.env.APP_PORT || 3000;
app.listen(port, () => console.log(`Server chạy tại http://localhost:${port}`));
