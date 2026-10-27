// Lớp 3 → Lớp 2: HỢP ĐỒNG dữ liệu kho trả ra từ lớp nghiệp vụ cho API (docs/api-contract.md).
// Đây là MỘT chỗ duy nhất biết cả tên cột CSDL lẫn tên trường API. Đổi tên cột hay tên trường
// thì chỉ sửa ở đây; controller và giao diện không bao giờ đọc thẳng dòng CSDL.
// tests/stock.contract.test.js kiểm tra đúng những gì comment dưới đây hứa.

/** QT-09: nhãn cảnh báo không lưu trong CSDL, tính từ tồn và ngưỡng; chỉ tồn < ngưỡng mới cảnh báo. */
function warningLabel(quantity, minThreshold) {
  if (quantity >= minThreshold) return null;
  return quantity === 0 ? 'HẾT HÀNG' : 'SẮP HẾT';
}

/**
 * Một dòng tồn (EP1, EP6).
 * HỢP ĐỒNG:
 *   part_code         : chuỗi, luôn có (mã theo parts.csv)
 *   part_name         : chuỗi, luôn có
 *   quantity          : số nguyên ≥ 0, đơn vị là CÁI, luôn có
 *   min_threshold     : số nguyên ≥ 0, luôn có
 *   unit_price        : số nguyên, đơn vị VND (CSDL trả NUMERIC dạng chuỗi nên phải đổi ở đây)
 *   low_stock_warning : boolean, true khi quantity < min_threshold
 *   warning_label     : 'HẾT HÀNG' | 'SẮP HẾT' | null (null = không cảnh báo, KHÔNG phải "chưa biết")
 * @param {{part_code:string, part_name:string, quantity:number, min_threshold:number, unit_price:string|number}} row
 */
function toStockItem(row) {
  const label = warningLabel(row.quantity, row.min_threshold);
  return {
    part_code: row.part_code,
    part_name: row.part_name,
    quantity: row.quantity,
    min_threshold: row.min_threshold,
    unit_price: Number(row.unit_price),
    low_stock_warning: label !== null,
    warning_label: label,
  };
}

/**
 * Một dòng "sắp hết" (EP4). Giống toStockItem nhưng có shortage và bỏ unit_price.
 *   shortage      : số nguyên > 0 = min_threshold − quantity (số cái cần nhập để hết cảnh báo)
 *   warning_label : 'HẾT HÀNG' | 'SẮP HẾT' (luôn có, vì danh sách chỉ gồm dòng tồn < ngưỡng)
 */
function toLowStockItem(row) {
  return {
    part_code: row.part_code,
    part_name: row.part_name,
    quantity: row.quantity,
    min_threshold: row.min_threshold,
    shortage: row.min_threshold - row.quantity,
    warning_label: warningLabel(row.quantity, row.min_threshold),
  };
}

/**
 * Kết quả xuất/nhập kho (EP2, EP3). Ba trường giao dịch đổi tên so với CSDL
 * (api-contract.md mục 1.1): loai → type, so_luong → quantity, ngay → transaction_date.
 *   transaction.type             : 'XUAT' | 'NHAP'
 *   transaction.quantity         : số nguyên > 0 (QT-L5-01: luôn dương, chiều do type quyết định)
 *   transaction.transaction_date : chuỗi 'YYYY-MM-DD' (ngày theo giờ máy chủ CSDL, không có giờ)
 *   transaction.ticket_code      : chuỗi với XUAT; null với NHAP
 *   stock                        : dòng tồn SAU khi ghi
 *   low_stock_warning, warning_label : như toStockItem, tính trên tồn SAU khi ghi (FR6)
 */
function toMovementResult(txn, stockRow) {
  const label = warningLabel(stockRow.quantity, stockRow.min_threshold);
  return {
    transaction: {
      transaction_id: Number(txn.transaction_id), // BIGSERIAL về dạng chuỗi
      type: txn.loai,
      quantity: txn.so_luong,
      transaction_date: txn.ngay,
      ticket_code: txn.ticket_code ?? null,
      part_code: stockRow.part_code,
    },
    stock: {
      part_code: stockRow.part_code,
      part_name: stockRow.part_name,
      quantity: stockRow.quantity,
      min_threshold: stockRow.min_threshold,
    },
    low_stock_warning: label !== null,
    warning_label: label,
  };
}

/**
 * Một linh kiện trong danh mục (TD-21). Danh mục dùng chung cho mọi trung tâm, không có tồn.
 *   part_code  : chuỗi, luôn có (khoá nghiệp vụ, không đổi được)
 *   part_name  : chuỗi, luôn có
 *   unit_price : số nguyên VND (CSDL trả NUMERIC dạng chuỗi nên phải đổi ở đây)
 * Không trả is_active: API chỉ trả linh kiện đang dùng; linh kiện đã ngừng dùng coi như không có (404).
 */
function toPartItem(row) {
  return { part_code: row.part_code, part_name: row.part_name, unit_price: Number(row.unit_price) };
}

/** Phần phân trang chung (api-contract.md mục 1.1). total_pages = 0 khi không có dòng nào. */
function toPage({ page, pageSize, totalItems }) {
  return {
    page,
    page_size: pageSize,
    total_items: totalItems,
    total_pages: Math.ceil(totalItems / pageSize),
  };
}

/**
 * Phiếu sửa chữa cho nút [Tra cứu] ở Màn hình 2 (EP-L2, bản đọc thay cho L2).
 *   ticket_code : chuỗi, luôn có
 *   status      : tên trạng thái có dấu ("Đang xử lý"...), theo api-contract mục 1.1
 *   center_id   : số nguyên, luôn có
 *   issue_desc  : chuỗi mô tả lỗi, luôn có
 *   exportable  : boolean, true khi phiếu đang ở trạng thái được xuất linh kiện (QT-L5-02)
 */
function toTicket(t) {
  return {
    ticket_code: t.ticketCode,
    status: t.statusLabel,
    center_id: t.centerId,
    issue_desc: t.issueDesc,
    exportable: t.exportable,
  };
}

/**
 * Linh kiện đã dùng của phiếu (EP8).
 *   items[].transaction_date : 'YYYY-MM-DD'
 *   items[].unit_price       : số nguyên VND, đơn giá HIỆN HÀNH trong danh mục (không lưu giá lúc xuất)
 *   items[].line_total       : quantity × unit_price
 *   total_amount             : tổng line_total; 0 khi phiếu chưa xuất linh kiện nào (items rỗng)
 */
function toUsedParts(ticketCode, rows) {
  const items = rows.map((r) => {
    const unitPrice = Number(r.unit_price);
    return {
      transaction_id: Number(r.transaction_id),
      transaction_date: r.ngay,
      part_code: r.part_code,
      part_name: r.part_name,
      quantity: r.so_luong,
      unit_price: unitPrice,
      line_total: r.so_luong * unitPrice,
    };
  });
  return {
    ticket_code: ticketCode,
    items,
    total_amount: items.reduce((sum, i) => sum + i.line_total, 0),
  };
}

module.exports = {
  warningLabel, toStockItem, toLowStockItem, toMovementResult, toPage, toTicket, toUsedParts, toPartItem,
};