// Lớp 4 (truy cập dữ liệu): chỉ có SQL, không chứa quy tắc nghiệp vụ.
// Trả về dòng CSDL "thô"; đổi sang hình dạng API là việc của services/stock.contract.js.
const db = require('../db/connection');

const COLUMNS = 'p.part_id, p.part_code, p.part_name, s.quantity, s.min_threshold, p.unit_price';
const FROM = 'FROM part_stock s JOIN part p ON p.part_id = s.part_id';

async function findPage({ centerId, q, lowOnly, limit, offset }) {
  const where = ['s.center_id = $1'];
  const params = [centerId];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(p.part_code ILIKE $${params.length} OR p.part_name ILIKE $${params.length})`);
  }
  if (lowOnly) where.push('s.quantity < s.min_threshold');

  const from = `${FROM} WHERE ${where.join(' AND ')}`;
  // FR6: danh sách "sắp hết" sắp theo mức thiếu giảm dần
  const orderBy = lowOnly ? '(s.min_threshold - s.quantity) DESC, p.part_code' : 'p.part_code';

  const total = await db.query(
    `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE s.quantity < s.min_threshold)::int AS low ${from}`,
    params
  );
  const rows = await db.query(
    `SELECT ${COLUMNS} ${from} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows: rows.rows, total: total.rows[0].n, low: total.rows[0].low };
}

// EP4 (FR6): mọi dòng tồn < ngưỡng, kể cả tồn = 0; mức thiếu giảm dần, cùng mức thì part_code tăng dần.
// Dùng chỉ mục một phần idx_stock_low (migration 002).
async function findLowPage({ centerId, limit, offset }) {
  const from = `${FROM} WHERE s.center_id = $1 AND s.quantity < s.min_threshold`;
  const counts = await db.query(
    `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE s.quantity = 0)::int AS out ${from}`,
    [centerId]
  );
  const rows = await db.query(
    `SELECT ${COLUMNS} ${from}
      ORDER BY (s.min_threshold - s.quantity) DESC, p.part_code
      LIMIT $2 OFFSET $3`,
    [centerId, limit, offset]
  );
  return { rows: rows.rows, total: counts.rows[0].n, outOfStock: counts.rows[0].out };
}

async function findOne(centerId, partCode) {
  const res = await db.query(
    `SELECT ${COLUMNS} ${FROM} WHERE s.center_id = $1 AND p.part_code = $2`,
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

// Khoá dòng tồn tới hết giao dịch (SELECT ... FOR UPDATE). Hai yêu cầu xuất cùng linh kiện
// phải xếp hàng tại đây; yêu cầu sau đọc tồn ĐÃ trừ của yêu cầu trước, nên tồn không bao giờ âm (NFR3).
// FOR UPDATE OF s: chỉ khoá part_stock, không khoá dòng part (danh mục dùng chung).
async function lockStock(client, centerId, partCode) {
  const res = await client.query(
    `SELECT ${COLUMNS} ${FROM} WHERE s.center_id = $1 AND p.part_code = $2 FOR UPDATE OF s`,
    [centerId, partCode]
  );
  return res.rows[0] || null;
}

// delta âm khi xuất, dương khi nhập. CHECK (quantity >= 0) ở CSDL là lớp bảo vệ cuối cùng.
async function changeQuantity(client, centerId, partId, delta) {
  const res = await client.query(
    `UPDATE part_stock SET quantity = quantity + $3
      WHERE center_id = $1 AND part_id = $2
  RETURNING quantity, min_threshold`,
    [centerId, partId, delta]
  );
  return res.rows[0];
}

// QT-L5-01: sổ giao dịch chỉ ghi thêm; module này không có hàm sửa hay xoá giao dịch.
async function insertTransaction(client, { centerId, partId, loai, soLuong, ticketCode }) {
  const res = await client.query(
    `INSERT INTO part_transaction (center_id, part_id, loai, so_luong, ticket_code)
     VALUES ($1, $2, $3, $4, $5)
  RETURNING transaction_id, loai, so_luong, ngay, ticket_code`,
    [centerId, partId, loai, soLuong, ticketCode ?? null]
  );
  return res.rows[0];
}

// Service mở giao dịch qua repository, không chạm thẳng vào lớp CSDL.
const inTransaction = (fn) => db.withTransaction(fn);

// EP8 (FR9): các giao dịch XUAT của một phiếu, kèm đơn giá hiện hành trong danh mục.
// Dùng chỉ mục idx_txn_ticket. Cũ trước, mới sau, để đọc như thứ tự đã lắp.
async function findUsedParts(centerId, ticketCode) {
  const res = await db.query(
    `SELECT t.transaction_id, t.ngay, t.so_luong, p.part_code, p.part_name, p.unit_price
       FROM part_transaction t JOIN part p ON p.part_id = t.part_id
      WHERE t.ticket_code = $1 AND t.loai = 'XUAT' AND t.center_id = $2
      ORDER BY t.ngay, t.transaction_id`,
    [ticketCode, centerId]
  );
  return res.rows;
}

module.exports = {
  inTransaction,
  findPage, findLowPage, findOne, updateThreshold, lockStock, changeQuantity, insertTransaction,
  findUsedParts,
};
