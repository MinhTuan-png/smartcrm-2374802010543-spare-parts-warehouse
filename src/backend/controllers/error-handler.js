// Lớp 2 (API): ánh xạ lỗi nghiệp vụ sang mã HTTP, theo MỘT định dạng cho toàn bộ API:
//   { "error": { "code": "...", "message": "...", "details": ... } }
// Giao diện rẽ nhánh theo error.code, không theo câu chữ của message (docs/api-contract.md, mục 1.1).
const crypto = require('crypto');
const { AppError } = require('../errors');

const STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  TICKET_STATE_INVALID: 422,
};

const body = (code, message, details = null) => ({ error: { code, message, details } });

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof AppError && STATUS[err.code]) {
    return res.status(STATUS[err.code]).json(body(err.code, err.message, err.details));
  }
  if (err.type === 'entity.parse.failed') { // JSON gửi lên bị hỏng: lỗi người dùng, không phải 500
    return res.status(400).json(body('VALIDATION_FAILED', 'Nội dung gửi lên không phải JSON hợp lệ.'));
  }
  // Lỗi không lường trước: ghi chi tiết vào log kèm mã tra cứu, người dùng chỉ thấy mã tra cứu.
  // Không bao giờ trả câu SQL, tên bảng hay stack trace ra ngoài.
  const lookupId = crypto.randomBytes(3).toString('hex').toUpperCase();
  console.error(`[${lookupId}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json(body(
    'INTERNAL_ERROR',
    `Hệ thống đang gặp sự cố, dữ liệu chưa thay đổi. Vui lòng thử lại sau ít phút. Mã tra cứu: ${lookupId}.`,
    { lookup_id: lookupId }
  ));
};
