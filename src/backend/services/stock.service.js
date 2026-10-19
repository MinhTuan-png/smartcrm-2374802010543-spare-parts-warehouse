// Lớp 3 (nghiệp vụ): QT-09 (cảnh báo tồn thấp), QT-14 (phạm vi trung tâm).
// Gọi repository, không viết SQL. Đối chiếu token/vai trò sẽ thêm ở BT2.
const repo = require('../repositories/stock.repository');
const { AppError } = require('../errors');

const PAGE_SIZE = 20;

// QT-09: cảnh báo không lưu, tính từ tồn và ngưỡng; chỉ tồn < ngưỡng mới cảnh báo.
function warningOf(quantity, minThreshold) {
  if (quantity >= minThreshold) return null;
  return quantity === 0 ? 'HET_HANG' : 'SAP_HET';
}

function toDto(row) {
  return {
    part_code: row.part_code,
    part_name: row.part_name,
    quantity: row.quantity,
    min_threshold: row.min_threshold,
    unit_price: Number(row.unit_price), // NUMERIC từ CSDL về dạng chuỗi
    warning: warningOf(row.quantity, row.min_threshold),
  };
}

async function listStock({ centerId, q, lowOnly, page }) {
  const { rows, total } = await repo.findPage({
    centerId, q, lowOnly, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
  });
  return { data: rows.map(toDto), page, page_size: PAGE_SIZE, total_items: total };
}

async function getStock(centerId, partCode) {
  const row = await repo.findOne(centerId, partCode);
  if (!row) throw notFound(centerId, partCode);
  return toDto(row);
}

async function setThreshold(centerId, partCode, minThreshold) {
  const row = await repo.updateThreshold(centerId, partCode, minThreshold);
  if (!row) throw notFound(centerId, partCode);
  return toDto(row);
}

function notFound(centerId, partCode) {
  return new AppError('NOT_FOUND', `Trung tâm ${centerId} không có dòng tồn của linh kiện ${partCode}`);
}

module.exports = { listStock, getStock, setThreshold };
