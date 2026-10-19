// Lỗi nghiệp vụ dùng chung giữa các lớp. Chỉ mang "mã lỗi" (theo SRS);
// việc đổi mã lỗi thành mã HTTP là của lớp API (controllers/error-handler.js).
class AppError extends Error {
  constructor(code, message, field) {
    super(message);
    this.code = code;   // VALIDATION_FAILED | NOT_FOUND | ...
    this.field = field; // tên trường lỗi (nếu có)
  }
}

module.exports = { AppError };
