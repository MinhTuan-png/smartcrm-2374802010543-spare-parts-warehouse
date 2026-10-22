// Lớp 2 (API): xác thực và phân quyền. Thứ tự kiểm tra theo docs/api-contract.md mục 1.1:
// (1) 401 thiếu/sai token → (2) 403 sai vai trò hoặc sai trung tâm → sau đó mới kiểm tra dữ liệu (400).
// Token được cấp ở POST /api/v1/auth/login (controllers/auth.controller.js).
const jwt = require('jsonwebtoken');
const { AppError } = require('../errors');

const ROLES = ['TECHNICIAN', 'MANAGER'];

function secret() {
  const key = process.env.SECRET_KEY;
  // Không có khoá mặc định: thiếu SECRET_KEY là lỗi cấu hình, phải lộ ra ngay khi chạy.
  if (!key) throw new Error('Thiếu SECRET_KEY trong .env');
  return key;
}

/**
 * Đọc header Authorization: Bearer <token> và gắn req.user.
 * HỢP ĐỒNG của token (payload JWT):
 *   user_id   : số nguyên dương, bắt buộc
 *   role      : 'TECHNICIAN' | 'MANAGER', bắt buộc
 *   center_id : số nguyên dương, bắt buộc — trung tâm người dùng làm việc (QT-14)
 * KHI SAI: thiếu header, token hết hạn, sai chữ ký hoặc payload thiếu trường → 401 UNAUTHORIZED.
 */
function authenticate(req, res, next) {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('UNAUTHORIZED', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.'));
  }
  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch (e) {
    if (e.message === 'Thiếu SECRET_KEY trong .env') return next(e);
    return next(new AppError('UNAUTHORIZED', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.'));
  }
  const { user_id: userId, role, center_id: centerId } = payload;
  if (!Number.isInteger(userId) || !ROLES.includes(role) || !Number.isInteger(centerId)) {
    return next(new AppError('UNAUTHORIZED', 'Phiên làm việc không hợp lệ. Vui lòng đăng nhập lại.'));
  }
  req.user = { userId, role, centerId };
  next();
}

/** Chỉ cho các vai trò được liệt kê đi tiếp; vai trò khác → 403 với câu báo riêng của endpoint (NFR5). */
const allowRoles = (roles, message) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('FORBIDDEN', message));

/**
 * QT-14: center_id trên đường dẫn phải bằng center_id trong token.
 * center_id không phải số nguyên → 400; khác token → 403, kể cả khi trung tâm đó
 * không tồn tại, để không lộ trung tâm nào có thật (NFR5).
 */
function sameCenter(req, res, next) {
  const id = Number(req.params.centerId);
  if (!Number.isInteger(id) || id <= 0) {
    return next(new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.',
      [{ field: 'center_id', reason: 'Phải là số nguyên dương.' }]));
  }
  if (id !== req.user.centerId) {
    return next(new AppError('FORBIDDEN', 'Bạn không có quyền truy cập dữ liệu của trung tâm này.'));
  }
  req.centerId = id;
  next();
}

/** Tạo token sau khi đăng nhập đúng (và cho scripts/make-token.js khi gọi API bằng curl). */
function signToken({ userId, role, centerId }, expiresIn = '8h') {
  return jwt.sign({ user_id: userId, role, center_id: centerId }, secret(), { expiresIn });
}

module.exports = { authenticate, allowRoles, sameCenter, signToken, ROLES };
