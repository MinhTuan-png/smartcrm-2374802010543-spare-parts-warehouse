// Lỗi nghiệp vụ dùng chung giữa các lớp. Chỉ mang "mã lỗi" (theo docs/api-contract.md, mục 1.1);
// việc đổi mã lỗi thành mã HTTP là của lớp API (controllers/error-handler.js).
class AppError extends Error {
  /**
   * @param {string} code    Mã máy đọc: VALIDATION_FAILED | UNAUTHORIZED | FORBIDDEN | NOT_FOUND
   *                         | INSUFFICIENT_STOCK | TICKET_STATE_INVALID | ALREADY_EXISTS
   *                         | STOCK_NOT_EMPTY | INTERNAL_ERROR
   * @param {string} message Câu cho người dùng đọc, tiếng Việt có dấu, không chứa chi tiết kỹ thuật.
   * @param {object|Array|null} [details] Dữ liệu kèm theo để giao diện hiển thị
   *                         (ví dụ danh sách trường sai, tồn hiện có). null nếu không có.
   */
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

module.exports = { AppError };