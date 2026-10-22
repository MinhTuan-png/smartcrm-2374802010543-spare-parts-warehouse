// Phiên đăng nhập. Token lưu trong localStorage: chấp nhận ở mức prototype vì giao diện không
// hiển thị HTML do người dùng nhập; hạn chế là trang bị lỗ hổng XSS thì token có thể bị đọc
// (ghi trong README). Bản chạy thật nên dùng cookie HttpOnly do máy chủ đặt.
const KEY = 'smartcrm.session';
const listeners = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

export const session = {
  /** @returns {{token:string, fullName:string, role:'TECHNICIAN'|'MANAGER', centerId:number}|null} */
  get: read,
  token: () => read()?.token ?? null,
  save(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
    listeners.forEach((fn) => fn());
  },
  clear() {
    localStorage.removeItem(KEY);
    listeners.forEach((fn) => fn());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
