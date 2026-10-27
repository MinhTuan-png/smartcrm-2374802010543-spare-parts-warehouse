// Lớp 3 (nghiệp vụ): danh mục linh kiện (TD-21). Danh mục dùng chung cho mọi trung tâm.
// QT-13: không xoá vật lý; "xoá" là ngừng dùng và chỉ được khi không trung tâm nào còn tồn.
// Gọi repository, không viết SQL. Nhận dữ liệu đã kiểm tra ở controller.
const repo = require('../repositories/part.repository');
const contract = require('./stock.contract');
const { AppError } = require('../errors');

const PAGE_SIZE = 20;

const notFound = (partCode) => new AppError('NOT_FOUND', `Không tìm thấy linh kiện ${partCode} trong danh mục.`);

/** Danh sách linh kiện đang dùng, lọc theo mã hoặc tên, 20 dòng một trang. */
async function listParts({ q, page }) {
  const { rows, total } = await repo.findPage({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  return {
    query: q,
    ...contract.toPage({ page, pageSize: PAGE_SIZE, totalItems: total }),
    items: rows.map(contract.toPartItem),
  };
}

async function getPart(partCode) {
  const row = await repo.findByCode(partCode);
  if (!row || !row.is_active) throw notFound(partCode);
  return contract.toPartItem(row);
}

/**
 * Thêm linh kiện. Mã đã ngừng dùng thì dùng lại mã đó (giữ part_id, nên lịch sử giao dịch cũ vẫn nối đúng).
 * @throws {AppError} ALREADY_EXISTS khi mã đang được dùng
 */
async function createPart({ partCode, partName, unitPrice }) {
  const row = await repo.insertOrReactivate({ partCode, partName, unitPrice });
  if (!row) {
    throw new AppError('ALREADY_EXISTS', `Mã linh kiện ${partCode} đã có trong danh mục.`, { part_code: partCode });
  }
  return contract.toPartItem(row);
}

/** Sửa tên và/hoặc đơn giá. Đơn giá mới áp dụng cả cho thành tiền ở EP8 (EP8 dùng giá hiện hành). */
async function updatePart(partCode, { partName, unitPrice }) {
  const row = await repo.update(partCode, { partName, unitPrice });
  if (!row) throw notFound(partCode);
  return contract.toPartItem(row);
}

/**
 * Ngừng dùng linh kiện (DELETE). Còn tồn ở bất kỳ trung tâm nào thì từ chối, vì ngừng dùng sẽ làm
 * số hàng đó "biến mất" khỏi màn hình tra cứu. Muốn ngừng thì xuất hết trước.
 * @throws {AppError} NOT_FOUND | STOCK_NOT_EMPTY
 */
async function deletePart(partCode) {
  return repo.inTransaction(async (client) => {
    const part = await repo.lockActive(client, partCode);
    if (!part) throw notFound(partCode);
    const withStock = (await repo.lockStocks(client, part.part_id)).filter((s) => s.quantity > 0);
    if (withStock.length > 0) {
      throw new AppError('STOCK_NOT_EMPTY',
        `Linh kiện ${partCode} còn tồn ở ${withStock.length} trung tâm nên chưa ngừng dùng được.`,
        { part_code: partCode, centers_with_stock: withStock.length });
    }
    await repo.deactivate(client, part.part_id);
  });
}

module.exports = { listParts, getPart, createPart, updatePart, deletePart };