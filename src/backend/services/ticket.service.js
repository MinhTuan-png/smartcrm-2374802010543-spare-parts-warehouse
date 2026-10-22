// Lớp 3 (nghiệp vụ): đọc phiếu sửa chữa cho Màn hình 2. L5 chỉ ĐỌC phiếu, không sửa (QT-14).
const tickets = require('../integrations/ticket.integration');
const repo = require('../repositories/stock.repository');
const contract = require('./stock.contract');
const { AppError } = require('../errors');

/** Phiếu phải có và thuộc trung tâm của người dùng; thứ tự 404 → 403 giống EP2. */
async function loadOwnTicket(ticketCode, centerId) {
  const ticket = await tickets.findTicket(ticketCode);
  if (!ticket) throw new AppError('NOT_FOUND', `Không tìm thấy phiếu ${ticketCode}.`);
  // QT-14: không nói phiếu thuộc trung tâm nào.
  if (ticket.centerId !== centerId) {
    throw new AppError('FORBIDDEN', 'Bạn không có quyền xem phiếu này.');
  }
  return ticket;
}

/** EP-L2: tra cứu phiếu (nút [Tra cứu] ở Màn hình 2). */
async function getTicket(ticketCode, centerId) {
  return contract.toTicket(await loadOwnTicket(ticketCode, centerId));
}

/** EP8 (FR9, UC10): linh kiện đã dùng của phiếu kèm thành tiền và tổng cộng. */
async function listUsedParts(ticketCode, centerId) {
  await loadOwnTicket(ticketCode, centerId);
  return contract.toUsedParts(ticketCode, await repo.findUsedParts(centerId, ticketCode));
}

module.exports = { getTicket, listUsedParts };
