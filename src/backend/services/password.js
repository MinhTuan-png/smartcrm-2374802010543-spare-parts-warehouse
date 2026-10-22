// Băm và kiểm tra mật khẩu bằng scrypt có sẵn trong Node (không thêm thư viện).
// Định dạng lưu: scrypt$<salt hex>$<hash hex>. Muối ngẫu nhiên mỗi tài khoản nên hai người
// cùng mật khẩu vẫn ra hai chuỗi khác nhau.
const crypto = require('crypto');

const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/** @returns {boolean} true nếu `password` khớp chuỗi đã băm; chuỗi hỏng định dạng → false. */
function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored).split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  // So sánh thời gian hằng: không để lộ "đúng được bao nhiêu ký tự" qua thời gian phản hồi.
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
