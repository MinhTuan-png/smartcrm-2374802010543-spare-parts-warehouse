// Tạo token thử để gọi API bằng curl (L5 không cấp token; xem controllers/auth.js).
// Dùng: npm run token -- TECHNICIAN 2     (vai trò, center_id, [user_id])
const path = require('path');
// quiet: chỉ in token, để gán thẳng vào biến $KTV trong PowerShell.
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { signToken, ROLES } = require('../controllers/auth');

const [role = 'TECHNICIAN', center = '2', user = '1'] = process.argv.slice(2);
if (!ROLES.includes(role)) {
  process.stderr.write(`Vai trò phải là ${ROLES.join(' hoặc ')}\n`);
  process.exit(1);
}
process.stdout.write(`${signToken({ userId: Number(user), role, centerId: Number(center) })}\n`);
