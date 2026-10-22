// Lớp 3 (nghiệp vụ): đăng nhập. Không biết gì về HTTP hay JWT; controller lo việc cấp token.
const repo = require('../repositories/user.repository');
const { verifyPassword } = require('./password');
const { AppError } = require('../errors');

// Băm sẵn một mật khẩu giả để khi sai tên đăng nhập vẫn tốn cùng thời gian kiểm tra,
// tránh đoán được tên đăng nhập nào có thật qua thời gian phản hồi.
const DUMMY_HASH = require('./password').hashPassword('khong-phai-mat-khau-that');

/**
 * Kiểm tra tên đăng nhập và mật khẩu.
 * @param {{username:string, password:string}} input đã kiểm tra định dạng ở controller
 * @returns {Promise<{userId:number, fullName:string, role:'TECHNICIAN'|'MANAGER', centerId:number, centerCode:string, centerName:string}>}
 * @throws {AppError} UNAUTHORIZED với CÙNG một câu cho cả hai trường hợp sai tên và sai mật khẩu.
 */
async function login({ username, password }) {
  const user = await repo.findByUsername(username);
  const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    throw new AppError('UNAUTHORIZED', 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }
  return {
    userId: Number(user.user_id),
    fullName: user.full_name,
    role: user.role,
    centerId: Number(user.center_id),
    centerCode: user.center_code,
    centerName: user.center_name,
  };
}

module.exports = { login };
