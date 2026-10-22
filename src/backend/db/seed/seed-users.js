// Tài khoản mẫu để đăng nhập (TD-14): mỗi trung tâm một kỹ thuật viên và một quản lý,
// tên đăng nhập ktv<center_id> và quanly<center_id>, ví dụ ktv2 / quanly2.
// Mật khẩu lấy từ DEMO_PASSWORD trong .env, không ghi cứng trong mã. Chạy lại không tạo trùng.
const { hashPassword } = require('../../services/password');

async function seedUsers(client) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return 'Bỏ qua tài khoản mẫu: chưa đặt DEMO_PASSWORD trong .env';

  const { rows: centers } = await client.query('SELECT center_id FROM service_center ORDER BY center_id');
  for (const { center_id: id } of centers) {
    for (const [prefix, role, title] of [['ktv', 'TECHNICIAN', 'Kỹ thuật viên'], ['quanly', 'MANAGER', 'Quản lý']]) {
      await client.query(
        `INSERT INTO app_user (username, password_hash, full_name, role, center_id)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
        [`${prefix}${id}`, hashPassword(password), `${title} trung tâm ${id}`, role, id]
      );
    }
  }
  return `Tài khoản mẫu: ktv<mã trung tâm> và quanly<mã trung tâm>, mật khẩu = DEMO_PASSWORD`;
}

module.exports = { seedUsers };
