// Lớp 4 (truy cập dữ liệu): chỉ có SQL, không chứa quy tắc nghiệp vụ.
const db = require('../db/connection');

const COLUMNS = 'p.part_code, p.part_name, s.quantity, s.min_threshold, p.unit_price';

async function findPage({ centerId, q, lowOnly, limit, offset }) {
  const where = ['s.center_id = $1'];
  const params = [centerId];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(p.part_code ILIKE $${params.length} OR p.part_name ILIKE $${params.length})`);
  }
  if (lowOnly) where.push('s.quantity < s.min_threshold');

  const from = `FROM part_stock s JOIN part p ON p.part_id = s.part_id WHERE ${where.join(' AND ')}`;
  // FR6: danh sách "sắp hết" sắp theo mức thiếu giảm dần
  const orderBy = lowOnly ? '(s.min_threshold - s.quantity) DESC, p.part_code' : 'p.part_code';

  const total = await db.query(`SELECT COUNT(*)::int AS n ${from}`, params);
  const rows = await db.query(
    `SELECT ${COLUMNS} ${from} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows: rows.rows, total: total.rows[0].n };
}

async function findOne(centerId, partCode) {
  const res = await db.query(
    `SELECT ${COLUMNS}
       FROM part_stock s JOIN part p ON p.part_id = s.part_id
      WHERE s.center_id = $1 AND p.part_code = $2`,
    [centerId, partCode]
  );
  return res.rows[0] || null;
}

// Trả về dòng sau khi sửa, hoặc null nếu không có dòng tồn (service sẽ quyết định NOT_FOUND).
async function updateThreshold(centerId, partCode, minThreshold) {
  const res = await db.query(
    `UPDATE part_stock s
        SET min_threshold = $3
       FROM part p
      WHERE s.part_id = p.part_id AND s.center_id = $1 AND p.part_code = $2
  RETURNING ${COLUMNS}`,
    [centerId, partCode, minThreshold]
  );
  return res.rows[0] || null;
}

module.exports = { findPage, findOne, updateThreshold };
