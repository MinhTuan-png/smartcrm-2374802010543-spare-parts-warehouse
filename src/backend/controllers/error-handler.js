// Lớp 2 (API): ánh xạ lỗi nghiệp vụ sang mã HTTP, theo MỘT định dạng cho toàn bộ API:
//   { "error": { "code": "...", "message": "...", "details": ... } }
// Giao diện rẽ nhánh theo error.code, không theo câu chữ của message (docs/api-contract.md, mục 1.1).
const crypto = require('crypto');
const { AppError } = require('../errors');
const { logger } = require('../logger');

const STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  TICKET_STATE_INVALID: 422,
};

// Lỗi cho biết KHÔNG kết nối được CSDL (CSDL tắt, đang khởi động lại, quá thời gian chờ):
// trả 503 thay vì 500 để bên gọi biết đây là sự cố tạm thời, thử lại sau là được.
const DB_UNAVAILABLE_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  '57P01', '57P02', '57P03']; // 57P0x: PostgreSQL đang tắt / khởi động lại / chưa nhận kết nối
const isDbUnavailable = (err) =>
  DB_UNAVAILABLE_CODES.includes(err.code)
  || /timeout exceeded when trying to connect|Connection terminated/i.test(err.message || '');

const body = (code, message, details = null) => ({ error: { code, message, details } });

// Ghi log ĐÚNG MỘT LẦN ở đây cho mọi lỗi; service, repository không tự ghi log rồi ném lại.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof AppError && STATUS[err.code]) {
    // Lỗi nghiệp vụ / lỗi người dùng: mức INFO, không phải sự cố hệ thống.
    logger.info('yêu cầu bị từ chối', { requestId: req.requestId, code: err.code });
    return res.status(STATUS[err.code]).json(body(err.code, err.message, err.details));
  }
  if (err.type === 'entity.parse.failed') { // JSON gửi lên bị hỏng: lỗi người dùng, không phải 500
    logger.info('yêu cầu bị từ chối', { requestId: req.requestId, code: 'VALIDATION_FAILED' });
    return res.status(400).json(body('VALIDATION_FAILED', 'Nội dung gửi lên không phải JSON hợp lệ.'));
  }
  // Lỗi không lường trước: ghi chi tiết vào log kèm mã tra cứu (= requestId), người dùng chỉ thấy mã tra cứu.
  // Không bao giờ trả câu SQL, tên bảng hay stack trace ra ngoài.
  const lookupId = req.requestId || crypto.randomBytes(3).toString('hex').toUpperCase();
  const unavailable = isDbUnavailable(err);
  logger.error(unavailable ? 'không kết nối được CSDL' : 'lỗi hệ thống', {
    requestId: lookupId, method: req.method, path: req.path, err,
  });
  res.status(unavailable ? 503 : 500).json(body(
    'INTERNAL_ERROR',
    unavailable
      ? `Không kết nối được cơ sở dữ liệu, dữ liệu chưa thay đổi. Vui lòng thử lại sau ít phút. Mã tra cứu: ${lookupId}.`
      : `Hệ thống đang gặp sự cố, dữ liệu chưa thay đổi. Vui lòng thử lại sau ít phút. Mã tra cứu: ${lookupId}.`,
    { lookup_id: lookupId }
  ));
};

module.exports.isDbUnavailable = isDbUnavailable;
