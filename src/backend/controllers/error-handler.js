// Lớp 2 (API): ánh xạ lỗi nghiệp vụ sang mã HTTP.
const { AppError } = require('../errors');

const STATUS = {
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  // 401, 403, 409, 422 sẽ thêm ở BT2 cùng xác thực và UC2
};

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(STATUS[err.code] || 500).json({
      error: { code: err.code, message: err.message, field: err.field },
    });
  }
  if (err.type === 'entity.parse.failed') { // JSON gửi lên bị hỏng
    return res.status(400).json({
      error: { code: 'VALIDATION_FAILED', message: 'Nội dung JSON không hợp lệ' },
    });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } });
};
