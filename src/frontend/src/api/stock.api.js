// Các hàm gọi API kho, mỗi nghiệp vụ một hàm. Trả về dữ liệu ĐÃ qua hàm chuyển đổi ở ranh giới
// (stock.view.js), nên trang không đọc tên trường của API.
import { request } from './client.js';
import {
  toStockPageView, toLowStockPageView, toMovementView, toStockRowView, toTicketView, toUsedPartsView,
} from './stock.view.js';

const base = (centerId) => `/api/v1/centers/${centerId}/stock`;

export const stockApi = {
  // EP1
  search: (centerId, { q = '', lowOnly = false, page = 1 } = {}) => {
    const p = new URLSearchParams({ page: String(page) });
    if (q.trim()) p.set('q', q.trim());
    if (lowOnly) p.set('low_only', 'true');
    return request(`${base(centerId)}?${p}`).then(toStockPageView);
  },
  // EP4
  low: (centerId, { page = 1 } = {}) =>
    request(`${base(centerId)}/low?page=${page}`).then(toLowStockPageView),
  // Một dòng tồn (hiện tồn hiện tại trước khi xuất/nhập)
  one: (centerId, partCode) =>
    request(`${base(centerId)}/${encodeURIComponent(partCode)}`).then(toStockRowView),
  // EP2
  exportPart: (centerId, { ticketCode, partCode, quantity }) =>
    request(`${base(centerId)}/exports`, {
      method: 'POST', body: { ticket_code: ticketCode, part_code: partCode, quantity },
    }).then(toMovementView),
  // EP3
  importPart: (centerId, { partCode, quantity }) =>
    request(`${base(centerId)}/imports`, { method: 'POST', body: { part_code: partCode, quantity } })
      .then(toMovementView),
  // EP6
  setThreshold: (centerId, partCode, minThreshold) =>
    request(`${base(centerId)}/${encodeURIComponent(partCode)}/threshold`, {
      method: 'PATCH', body: { min_threshold: minThreshold },
    }).then(toStockRowView),
};

// Mã phiếu có dấu "/" (BH-000002/2025) nên phải mã hoá khi đặt trên đường dẫn.
const ticketPath = (code) => `/api/v1/tickets/${encodeURIComponent(code)}`;

export const ticketApi = {
  // EP-L2: nút [Tra cứu] ở Màn hình 2
  get: (ticketCode) => request(ticketPath(ticketCode)).then(toTicketView),
  // EP8: linh kiện đã dùng trên phiếu (UC10)
  usedParts: (ticketCode) => request(`${ticketPath(ticketCode)}/used-parts`).then(toUsedPartsView),
};

export const authApi = {
  login: (username, password) =>
    request('/api/v1/auth/login', { method: 'POST', body: { username, password } })
      .then((r) => ({
        token: r.access_token, fullName: r.full_name, role: r.role, centerId: r.center_id,
        centerCode: r.center_code, centerName: r.center_name,
      })),
};
