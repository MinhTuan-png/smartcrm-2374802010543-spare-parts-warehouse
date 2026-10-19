// Điểm khởi động: chỉ nạp cấu hình, gắn controller và chạy server.
// Không chứa logic nghiệp vụ hay SQL.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // .env ở thư mục gốc repo

const express = require('express');
const stockController = require('./controllers/stock.controller');
const errorHandler = require('./controllers/error-handler');

const app = express();
app.use(express.json());
app.use('/centers/:centerId/stock', stockController);
app.use(errorHandler);

const port = process.env.APP_PORT || 3000;
app.listen(port, () => console.log(`Server chạy tại http://localhost:${port}`));
