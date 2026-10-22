// Lớp 2 (API): POST /api/v1/auth/login. Nhận tên đăng nhập, mật khẩu; trả token JWT 8 giờ.
const express = require('express');
const service = require('../services/auth.service');
const { signToken } = require('./auth');
const { schemas, validate } = require('../validators/stock.schema');

const router = express.Router();
// wrap: hàm async ném lỗi thì chuyển lỗi sang next() để error-handler trả đúng định dạng lỗi chung.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Ba bước: kiểm tra định dạng (400) → kiểm tra tài khoản ở lớp nghiệp vụ (401) → ký token và trả về.
router.post('/login', wrap(async (req, res) => {
  const body = validate(schemas.loginBody, req.body);
  const user = await service.login(body);
  res.json({
    access_token: signToken(user), // token chứa vai trò và trung tâm, giao diện gửi lại ở mọi lệnh gọi sau
    full_name: user.fullName,
    role: user.role,
    center_id: user.centerId,
    center_code: user.centerCode, // để giao diện ghi "TT02 - TTBH Quận Tân Bình" như wireframe
    center_name: user.centerName,
  });
}));

module.exports = router;
