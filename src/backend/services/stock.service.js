// Lớp 3 (nghiệp vụ): QT-09 (không xuất quá tồn, cảnh báo tồn thấp), QT-14 (phạm vi trung tâm),
// QT-L5-01 (sổ giao dịch chỉ ghi thêm), QT-L5-02 (trạng thái phiếu được phép xuất).
// Gọi repository và lớp tích hợp L2, không viết SQL. Nhận dữ liệu đã kiểm tra ở controller.
const repo = require('../repositories/stock.repository');
const parts = require('../repositories/part.repository');
const tickets = require('../integrations/ticket.integration');
const contract = require('./stock.contract');
const { AppError } = require('../errors');

const PAGE_SIZE = 20;

/** EP1 (FR1, FR6): tra cứu tồn của trung tâm. Không có dòng nào khớp → items rỗng, không phải lỗi. */
async function listStock({ centerId, q, lowOnly, page }) {
  const { rows, total, low } = await repo.findPage({
    centerId, q, lowOnly, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
  });
  return {
    center_id: centerId,
    query: q,
    low_only: lowOnly,
    ...contract.toPage({ page, pageSize: PAGE_SIZE, totalItems: total }),
    // Mốc so sánh cho giao diện: trong total_items dòng khớp, bao nhiêu dòng dưới ngưỡng.
    low_stock_count: low,
    items: rows.map(contract.toStockItem),
  };
}

/** EP4 (FR6): danh sách sắp hết, kèm số dòng HẾT HÀNG để giao diện có ngữ cảnh so sánh. */
async function listLowStock({ centerId, page }) {
  const { rows, total, outOfStock } = await repo.findLowPage({
    centerId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
  });
  return {
    center_id: centerId,
    ...contract.toPage({ page, pageSize: PAGE_SIZE, totalItems: total }),
    out_of_stock_count: outOfStock,
    items: rows.map(contract.toLowStockItem),
  };
}

async function getStock(centerId, partCode) {
  const row = await repo.findOne(centerId, partCode);
  if (!row) throw notFound(partCode);
  return contract.toStockItem(row);
}

/** EP6 (FR8): đặt ngưỡng cho dòng tồn có sẵn (dòng mới thì tạo bằng createStock). */
async function setThreshold(centerId, partCode, minThreshold) {
  const row = await repo.updateThreshold(centerId, partCode, minThreshold);
  if (!row) throw notFound(partCode);
  return contract.toStockItem(row);
}

/**
 * EP2 (FR2, FR3, FR6): xuất linh kiện cho phiếu. Trừ tồn và ghi 1 giao dịch XUAT trong CÙNG
 * một giao dịch CSDL; lỗi ở bất kỳ bước nào thì tồn và sổ giao dịch không đổi.
 *
 * Thứ tự lỗi theo docs/api-contract.md mục 1.1 (sau 401/403/400 ở controller):
 *   404 phiếu không có → 404 linh kiện không có dòng tồn → 403 phiếu của trung tâm khác
 *   → 422 phiếu sai trạng thái → 409 tồn không đủ.
 *
 * @param {{centerId:number, ticketCode:string, partCode:string, quantity:number}} input
 * @returns {Promise<object>} hình dạng của contract.toMovementResult
 * @throws {AppError} NOT_FOUND | FORBIDDEN | TICKET_STATE_INVALID | INSUFFICIENT_STOCK
 */
async function exportPart({ centerId, ticketCode, partCode, quantity }) {
  return repo.inTransaction(async (client) => {
    const ticket = await tickets.findTicket(ticketCode, client);
    if (!ticket) throw new AppError('NOT_FOUND', `Không tìm thấy phiếu ${ticketCode}.`);

    // Khoá dòng tồn TRƯỚC khi đọc số lượng: yêu cầu đồng thời phải chờ ở đây (NFR3).
    const stock = await repo.lockStock(client, centerId, partCode);
    if (!stock) throw notFound(partCode);

    // QT-14: không nói phiếu thuộc trung tâm nào, để không lộ dữ liệu trung tâm khác.
    if (ticket.centerId !== centerId) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền xuất linh kiện cho phiếu này.');
    }
    if (!ticket.exportable) { // QT-L5-02
      throw new AppError('TICKET_STATE_INVALID', 'Phiếu không ở trạng thái cho phép xuất linh kiện.', {
        ticket_code: ticketCode,
        current_status: ticket.statusLabel,
        allowed_statuses: tickets.allowedExportLabels(),
      });
    }
    if (quantity > stock.quantity) { // QT-09
      throw new AppError('INSUFFICIENT_STOCK', 'Tồn kho không đủ để xuất.', {
        part_code: partCode,
        requested_quantity: quantity,
        available_quantity: stock.quantity,
        ticket_status: ticket.statusLabel, // để giao diện biết có được "Báo thiếu linh kiện" không (UC5)
      });
    }

    const after = await repo.changeQuantity(client, centerId, stock.part_id, -quantity);
    const txn = await repo.insertTransaction(client, {
      centerId, partId: stock.part_id, loai: 'XUAT', soLuong: quantity, ticketCode,
    });
    return contract.toMovementResult(txn, { ...stock, ...after });
  });
}

/**
 * EP3 (FR5, FR6): ghi nhập kho. Cộng tồn và ghi 1 giao dịch NHAP (không có mã phiếu)
 * trong cùng một giao dịch CSDL. Hai lần nhập đồng thời xếp hàng nhờ khoá dòng tồn,
 * cả hai đều thành công và tồn cuối bằng tổng (UC6 bước 5a).
 * @throws {AppError} NOT_FOUND khi linh kiện không có dòng tồn tại trung tâm (UC6 bước 4b)
 */
async function importPart({ centerId, partCode, quantity }) {
  return repo.inTransaction(async (client) => {
    const stock = await repo.lockStock(client, centerId, partCode);
    if (!stock) throw notFound(partCode);
    const after = await repo.changeQuantity(client, centerId, stock.part_id, quantity);
    const txn = await repo.insertTransaction(client, {
      centerId, partId: stock.part_id, loai: 'NHAP', soLuong: quantity, ticketCode: null,
    });
    return contract.toMovementResult(txn, { ...stock, ...after });
  });
}

/**
 * Thêm dòng tồn cho trung tâm (TD-21): linh kiện phải có trong danh mục; tồn bắt đầu bằng 0,
 * muốn có hàng thì ghi nhập kho (EP3) để sổ giao dịch giải thích được từng cái (QT-L5-01).
 * @throws {AppError} NOT_FOUND khi linh kiện không có trong danh mục | ALREADY_EXISTS khi trung tâm đã có dòng tồn
 */
async function createStock({ centerId, partCode, minThreshold }) {
  const row = await repo.insertOrReactivate(centerId, partCode, minThreshold);
  if (row) return contract.toStockItem(row);
  const part = await parts.findByCode(partCode);
  if (!part || !part.is_active) {
    throw new AppError('NOT_FOUND', `Không tìm thấy linh kiện ${partCode} trong danh mục.`);
  }
  throw new AppError('ALREADY_EXISTS', `Trung tâm của bạn đã có dòng tồn của linh kiện ${partCode}.`,
    { part_code: partCode });
}

/**
 * Ngừng dùng một dòng tồn (DELETE, TD-21). Chỉ được khi tồn = 0: còn hàng mà ngừng thì số hàng đó
 * biến mất khỏi tra cứu. Khoá dòng tồn như khi nhập/xuất nên không có lần nhập nào chen vào giữa.
 * @throws {AppError} NOT_FOUND | STOCK_NOT_EMPTY
 */
async function deleteStock(centerId, partCode) {
  return repo.inTransaction(async (client) => {
    const stock = await repo.lockStock(client, centerId, partCode);
    if (!stock) throw notFound(partCode);
    if (stock.quantity > 0) {
      throw new AppError('STOCK_NOT_EMPTY',
        `Linh kiện ${partCode} còn ${stock.quantity} cái nên chưa ngừng dùng được. Xuất hết trước rồi thử lại.`,
        { part_code: partCode, quantity: stock.quantity });
    }
    await repo.deactivate(client, centerId, stock.part_id);
  });
}

function notFound(partCode) {
  return new AppError('NOT_FOUND', `Trung tâm của bạn không có dòng tồn của linh kiện ${partCode}.`);
}

module.exports = {
  PAGE_SIZE, listStock, listLowStock, getStock, setThreshold, exportPart, importPart,
  createStock, deleteStock,
};