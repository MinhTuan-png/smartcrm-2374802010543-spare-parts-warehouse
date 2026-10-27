// Lớp 2 (API): gắn mã tương quan (requestId) cho mỗi yêu cầu để lần theo một yêu cầu qua nhiều dòng log.
// Lỗi 500/503 trả requestId này cho người dùng làm "mã tra cứu" (details.lookup_id), nên mã ngắn, đọc được.
const crypto = require('crypto');
const { logger } = require('../logger');

// Nhận X-Request-Id do bên gọi gửi nếu đúng dạng (chống chèn ký tự lạ vào log); không thì tự sinh.
const VALID_ID = /^[A-Za-z0-9-]{1,64}$/;
const newId = () => crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 ký tự, ví dụ 3FA21C

module.exports = function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.requestId = typeof incoming === 'string' && VALID_ID.test(incoming) ? incoming : newId();
  res.setHeader('X-Request-Id', req.requestId);
  const start = Date.now();
  // /health được docker gọi mỗi 10 giây: ghi ở mức debug để không lấp log thật.
  const log = req.path === '/health' ? logger.debug : logger.info;
  res.on('finish', () => log('yêu cầu hoàn tất', {
    requestId: req.requestId,
    method: req.method,
    path: req.path, // không ghi query string: có thể chứa dữ liệu người dùng gõ
    status: res.statusCode,
    durationMs: Date.now() - start,
  }));
  next();
};
