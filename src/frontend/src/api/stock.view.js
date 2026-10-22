// RANH GIỚI API → giao diện. Chỉ tệp này biết tên trường snake_case của backend
// (docs/api-contract.md). Backend đổi tên trường thì chỉ sửa ở đây; các trang dùng tên dưới đây.
// src/api/stock.view.test.js kiểm tra đúng những gì comment này hứa.

const vnd = new Intl.NumberFormat('vi-VN');

/** 650000 → "650.000 ₫" (kiểu Việt Nam, không có số lẻ). */
export const formatVnd = (n) => `${vnd.format(n)} ₫`;

/**
 * Một dòng tồn để hiển thị.
 * HỢP ĐỒNG:
 *   partCode, partName : chuỗi, luôn có
 *   quantity, minThreshold : số nguyên ≥ 0, luôn có
 *   unitPriceText      : chuỗi "650.000 ₫", hoặc null nếu API không gửi đơn giá (danh sách sắp hết)
 *   warning            : 'HẾT HÀNG' | 'SẮP HẾT' | null — null nghĩa là KHÔNG cảnh báo
 *   shortage           : số cái còn thiếu so với ngưỡng (0 khi không thiếu)
 */
export function toStockRowView(item) {
  return {
    partCode: item.part_code,
    partName: item.part_name,
    quantity: item.quantity,
    minThreshold: item.min_threshold,
    unitPriceText: item.unit_price === undefined ? null : formatVnd(item.unit_price),
    warning: item.warning_label ?? null,
    shortage: item.shortage ?? Math.max(item.min_threshold - item.quantity, 0),
  };
}

const toPaging = (r) => ({
  page: r.page,
  pageSize: r.page_size,
  totalItems: r.total_items,
  totalPages: r.total_pages,
});

/** EP1. `rows` là mảng (có thể rỗng); `lowCount` = số dòng dưới ngưỡng trong totalItems dòng khớp;
 *  `loadedAt` để ghi rõ số liệu tính tới lúc nào. */
export const toStockPageView = (r) => ({
  ...toPaging(r), lowCount: r.low_stock_count, rows: r.items.map(toStockRowView), loadedAt: new Date(),
});

/** EP4. outOfStock = số dòng HẾT HÀNG, dùng làm ngữ cảnh so sánh trên tiêu đề. */
export const toLowStockPageView = (r) => ({
  ...toPaging(r), outOfStock: r.out_of_stock_count, rows: r.items.map(toStockRowView), loadedAt: new Date(),
});

/** EP2, EP3. ticketCode = null với giao dịch NHAP. */
export function toMovementView(r) {
  return {
    transactionId: r.transaction.transaction_id,
    type: r.transaction.type,
    quantity: r.transaction.quantity,
    date: r.transaction.transaction_date,
    ticketCode: r.transaction.ticket_code,
    stock: toStockRowView({ ...r.stock, warning_label: r.warning_label }),
  };
}

/** EP-L2. status là tên có dấu ("Đang xử lý"); exportable = được xuất linh kiện (QT-L5-02). */
export const toTicketView = (t) => ({
  ticketCode: t.ticket_code, status: t.status, issueDesc: t.issue_desc, exportable: t.exportable,
});

/** EP8. `rows` rỗng khi phiếu chưa xuất linh kiện nào; totalText luôn có (0 ₫ khi rỗng). */
export const toUsedPartsView = (r) => ({
  rows: r.items.map((i) => ({
    id: i.transaction_id,
    date: i.transaction_date,
    partCode: i.part_code,
    partName: i.part_name,
    quantity: i.quantity,
    unitPriceText: formatVnd(i.unit_price),
    lineTotalText: formatVnd(i.line_total),
  })),
  totalText: formatVnd(r.total_amount),
});

/** "TT02 - TTBH Quận Tân Bình" như wireframe; phiên cũ chưa có tên trung tâm thì ghi "Trung tâm 2". */
export const centerLabel = (user) =>
  (user.centerCode ? `${user.centerCode} - ${user.centerName}` : `Trung tâm ${user.centerId}`);

/** "2026-10-02" → "02/10/2026" */
export const formatDate = (iso) => iso.split('-').reverse().join('/');

export const formatTime = (d) =>
  d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
