// Dựng CSDL test riêng (mặc định smartcrm_test) với dữ liệu mẫu nhỏ, lấy đúng các bản ghi
// dùng trong ví dụ của docs/api-contract.md (trung tâm 2). Test tự dựng dữ liệu nên không cần
// thư mục data/; mỗi lần gọi reset() là xoá sạch và nạp lại, các test không phụ thuộc nhau.
const fs = require('fs');
const path = require('path');

process.env.DB_NAME = process.env.TEST_DB_NAME || 'smartcrm_test';
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret';

const BACKEND = path.resolve(__dirname, '../../src/backend');
const db = require(path.join(BACKEND, 'db/connection'));
const { hashPassword } = require(path.join(BACKEND, 'services/password'));

// Chặn chạy nhầm lên CSDL thật: reset() xoá toàn bộ dữ liệu.
if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(`Từ chối chạy test trên CSDL "${process.env.DB_NAME}": tên phải kết thúc bằng _test`);
}

async function isReachable() {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  const dir = path.join(BACKEND, 'db/migrations');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.query(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
}

// [center_id, part_code, part_name, unit_price, quantity, min_threshold]
const STOCK = [
  [2, 'PIN-OP-03', 'Pin OPPO loại 3', 650000, 10, 3],
  [2, 'PIN-OP-02', 'Pin OPPO loại 2', 280000, 7, 8],
  [2, 'MH-AP-03', 'Màn hình Apple loại 3', 980000, 1, 8],
  [2, 'CS-AP-02', 'Cổng sạc Apple loại 2', 120000, 6, 5],
  [2, 'LOA-AP-01', 'Loa ngoài Apple loại 1', 200000, 1, 8],
  [2, 'CAM-AP-01', 'Camera sau Apple loại 1', 900000, 0, 8],
  [2, 'LOA-SS-01', 'Loa ngoài Samsung loại 1', 650000, 5, 5],
  [3, 'PIN-OP-03', 'Pin OPPO loại 3', 650000, 4, 3],
];
// [ticket_code, center_id, status]
const TICKETS = [
  ['BH-000002/2025', 2, 'DANG_XU_LY'],
  ['BH-000003/2025', 2, 'CHO_LINH_KIEN'],
  ['BH-000009/2026', 2, 'DA_PHAN_CONG'],
  ['BH-000100/2026', 3, 'DANG_XU_LY'],
];

// [username, role, center_id]; mọi tài khoản dùng TEST_PASSWORD
const USERS = [['ktv2', 'TECHNICIAN', 2], ['quanly2', 'MANAGER', 2]];
const TEST_PASSWORD = 'mat-khau-test';

async function reset() {
  await migrate();
  await db.query(`TRUNCATE app_user, part_transaction, part_stock, ticket_status_log, ticket, part, service_center
                  RESTART IDENTITY CASCADE`);
  await db.query(`INSERT INTO service_center (center_id, center_code, center_name, thanh_pho)
                  VALUES (2, 'HCM02', 'Trung tâm 2', 'TP.HCM'), (3, 'CT03', 'Trung tâm 3', 'Cần Thơ')`);
  const partIds = {};
  for (const [, code, name, price] of STOCK) {
    if (partIds[code]) continue;
    const r = await db.query(
      'INSERT INTO part (part_code, part_name, unit_price) VALUES ($1, $2, $3) RETURNING part_id',
      [code, name, price]
    );
    partIds[code] = r.rows[0].part_id;
  }
  for (const [center, code, , , qty, min] of STOCK) {
    await db.query('INSERT INTO part_stock VALUES ($1, $2, $3, $4)', [center, partIds[code], qty, min]);
  }
  for (const [username, role, center] of USERS) {
    await db.query(
      `INSERT INTO app_user (username, password_hash, full_name, role, center_id) VALUES ($1, $2, $3, $4, $5)`,
      [username, hashPassword(TEST_PASSWORD), username, role, center]
    );
  }
  for (const [code, center, status] of TICKETS) {
    await db.query(
      `INSERT INTO ticket (ticket_code, center_id, status, issue_desc) VALUES ($1, $2, $3, 'Máy không lên nguồn')`,
      [code, center, status]
    );
  }
}

async function quantityOf(centerId, partCode) {
  const r = await db.query(
    `SELECT s.quantity FROM part_stock s JOIN part p USING (part_id)
      WHERE s.center_id = $1 AND p.part_code = $2`,
    [centerId, partCode]
  );
  return r.rows[0].quantity;
}

async function countTransactions(loai) {
  const r = await db.query('SELECT COUNT(*)::int AS n FROM part_transaction WHERE loai = $1', [loai]);
  return r.rows[0].n;
}

module.exports = { db, BACKEND, TEST_PASSWORD, isReachable, reset, quantityOf, countTransactions };
