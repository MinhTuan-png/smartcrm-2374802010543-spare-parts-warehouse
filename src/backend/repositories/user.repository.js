// Lớp 4 (truy cập dữ liệu): tài khoản đăng nhập. Chỉ có SQL.
const db = require('../db/connection');

/**
 * Tìm tài khoản theo tên đăng nhập, kèm mã và tên trung tâm (JOIN service_center) để giao diện hiển thị.
 * @returns {Promise<object|null>} null khi không có tài khoản; lớp nghiệp vụ quyết định báo lỗi gì.
 */
async function findByUsername(username) {
  const res = await db.query(
    `SELECT u.user_id, u.username, u.password_hash, u.full_name, u.role, u.center_id,
            c.center_code, c.center_name
       FROM app_user u JOIN service_center c ON c.center_id = u.center_id
      WHERE u.username = $1`, // $1: tham số hóa, không ghép chuỗi nên không bị SQL injection
    [username]
  );
  return res.rows[0] || null;
}

module.exports = { findByUsername };
