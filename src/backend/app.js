// Dựng ứng dụng Express: gắn middleware và controller. Tách khỏi index.js để test gọi được app
// mà không mở cổng mạng. Không chứa logic nghiệp vụ hay SQL.
const express = require('express');
const stockController = require('./controllers/stock.controller');
const authController = require('./controllers/auth.controller');
const ticketController = require('./controllers/ticket.controller');
const errorHandler = require('./controllers/error-handler');
const { AppError } = require('./errors');

const app = express();

// CORS cho giao diện chạy ở cổng khác (Vite 5173, nếu 5173 bị chiếm thì Vite tự sang 5174).
// CORS_ORIGIN trong .env có thể khai báo nhiều nguồn, cách nhau bằng dấu phẩy.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(express.json()); // đọc body JSON của POST/PATCH vào req.body

// Mỗi nhóm đường dẫn do một controller lo (lớp 2 trong sơ đồ kiến trúc).
app.use('/api/v1/auth', authController);
app.use('/api/v1/centers/:centerId/stock', stockController); // theo docs/api-contract.md
app.use('/api/v1/tickets', ticketController);

// Đường dẫn không có: trả cùng định dạng lỗi thay vì trang HTML mặc định của Express.
app.use((req, res, next) => next(new AppError('NOT_FOUND', 'Không tìm thấy đường dẫn API này.')));
app.use(errorHandler);

module.exports = app;
