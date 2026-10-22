// Khung "Tích hợp với L2" (Hình 3.1): L5 chỉ ĐỌC phiếu của L2, không sửa phiếu.
// Đây là ranh giới với luồng khác, nên mã trạng thái trong CSDL (DANG_XU_LY...) được đổi sang
// tên có dấu ("Đang xử lý"...) ngay tại đây, đúng quy ước của docs/api-contract.md mục 1.1.
const db = require('../db/connection');

const STATUS_LABEL = {
  MOI: 'Mới',
  DA_PHAN_CONG: 'Đã phân công',
  DANG_XU_LY: 'Đang xử lý',
  CHO_LINH_KIEN: 'Chờ linh kiện',
  HOAN_TAT: 'Hoàn tất',
  DA_DONG: 'Đã đóng',
  DA_HUY: 'Đã hủy',
};

// QT-L5-02: chỉ xuất linh kiện cho phiếu đang ở hai trạng thái này.
const EXPORTABLE = ['DANG_XU_LY', 'CHO_LINH_KIEN'];

/**
 * Đọc một phiếu theo mã. Dùng cho EP2 (kiểm tra trạng thái) và nút [Tra cứu] ở Màn hình 2.
 * @param {string} ticketCode dạng BH-000002/2025 (đã kiểm tra định dạng ở controller)
 * @param {{query: Function}} [client] client đang mở giao dịch; bỏ trống thì dùng pool
 * @returns {Promise<{ticketCode:string, centerId:number, status:string, statusLabel:string, issueDesc:string, exportable:boolean}|null>}
 *          null khi không có phiếu (service quyết định 404).
 */
async function findTicket(ticketCode, client = db) {
  const res = await client.query(
    'SELECT ticket_code, center_id, status, issue_desc FROM ticket WHERE ticket_code = $1',
    [ticketCode]
  );
  const t = res.rows[0];
  if (!t) return null;
  return {
    ticketCode: t.ticket_code,
    centerId: Number(t.center_id),
    status: t.status,
    statusLabel: STATUS_LABEL[t.status],
    issueDesc: t.issue_desc,
    exportable: EXPORTABLE.includes(t.status),
  };
}

const allowedExportLabels = () => EXPORTABLE.map((s) => STATUS_LABEL[s]);

module.exports = { findTicket, allowedExportLabels, STATUS_LABEL };
