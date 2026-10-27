// Lớp 4 (truy cập dữ liệu) cho danh mục linh kiện (TD-21): chỉ có SQL, không chứa quy tắc nghiệp vụ.
// "Xoá" là đặt is_active = FALSE (QT-13: không xoá vật lý); mọi truy vấn đọc chỉ thấy linh kiện đang dùng.
const db = require('../db/connection');

const COLUMNS = 'part_id, part_code, part_name, unit_price, is_active';

async function findPage({ q, limit, offset }) {
  const where = ['is_active'];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(part_code ILIKE $1 OR part_name ILIKE $1)`);
  }
  const from = `FROM part WHERE ${where.join(' AND ')}`;
  const total = await db.query(`SELECT COUNT(*)::int AS n ${from}`, params);
  const rows = await db.query(
    `SELECT ${COLUMNS} ${from} ORDER BY part_code LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows: rows.rows, total: total.rows[0].n };
}

/** Tìm theo mã, kể cả linh kiện đã ngừng dùng (service cần biết để dùng lại mã). */
async function findByCode(partCode) {
  const res = await db.query(`SELECT ${COLUMNS} FROM part WHERE part_code = $1`, [partCode]);
  return res.rows[0] || null;
}

/**
 * Thêm mới, hoặc DÙNG LẠI mã đã ngừng dùng (cập nhật tên, giá). Mã đang dùng thì không đổi gì
 * và trả null (service quyết định ALREADY_EXISTS). Một câu lệnh nên hai yêu cầu cùng mã không tạo trùng.
 */
async function insertOrReactivate({ partCode, partName, unitPrice }) {
  const res = await db.query(
    `INSERT INTO part (part_code, part_name, unit_price) VALUES ($1, $2, $3)
     ON CONFLICT (part_code) DO UPDATE
        SET part_name = EXCLUDED.part_name, unit_price = EXCLUDED.unit_price, is_active = TRUE
      WHERE part.is_active = FALSE
  RETURNING ${COLUMNS}`,
    [partCode, partName, unitPrice]
  );
  return res.rows[0] || null;
}

/** Sửa tên và/hoặc giá; trường undefined giữ nguyên. Không có linh kiện đang dùng → null. */
async function update(partCode, { partName, unitPrice }) {
  const res = await db.query(
    `UPDATE part SET part_name = COALESCE($2, part_name), unit_price = COALESCE($3, unit_price)
      WHERE part_code = $1 AND is_active
  RETURNING ${COLUMNS}`,
    [partCode, partName ?? null, unitPrice ?? null]
  );
  return res.rows[0] || null;
}

/** Khoá linh kiện đang dùng tới hết giao dịch; không có → null. */
async function lockActive(client, partCode) {
  const res = await client.query(
    `SELECT ${COLUMNS} FROM part WHERE part_code = $1 AND is_active FOR UPDATE`, [partCode]
  );
  return res.rows[0] || null;
}

/**
 * Khoá mọi dòng tồn đang dùng của linh kiện và trả số lượng của từng trung tâm. Khoá để lần nhập kho
 * (cũng khoá dòng tồn, xem stock.repository.lockStock) không chen vào giữa lúc kiểm tồn và lúc ngừng dùng.
 */
async function lockStocks(client, partId) {
  const res = await client.query(
    'SELECT center_id, quantity FROM part_stock WHERE part_id = $1 AND is_active FOR UPDATE', [partId]
  );
  return res.rows;
}

/** Ngừng dùng linh kiện cùng mọi dòng tồn của nó. Không xoá dòng nào (QT-13). */
async function deactivate(client, partId) {
  await client.query('UPDATE part_stock SET is_active = FALSE WHERE part_id = $1', [partId]);
  await client.query('UPDATE part SET is_active = FALSE WHERE part_id = $1', [partId]);
}

const inTransaction = (fn) => db.withTransaction(fn);

module.exports = {
  inTransaction, findPage, findByCode, insertOrReactivate, update, lockActive, lockStocks, deactivate,
};