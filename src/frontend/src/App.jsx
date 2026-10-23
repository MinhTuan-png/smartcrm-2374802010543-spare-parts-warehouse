// Khung ứng dụng: điều hướng theo hash (#/ton-kho...) và phiên đăng nhập.
// Hết phiên (API trả 401) thì session bị xoá và ứng dụng tự quay về trang đăng nhập.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { session } from './api/session.js';
import { centerLabel } from './api/stock.view.js';
import LoginPage from './pages/LoginPage.jsx';
import StockPage from './pages/StockPage.jsx';
import ExportPage from './pages/ExportPage.jsx';
import ImportPage from './pages/ImportPage.jsx';

// Ba màn hình theo wireframe BT1 mục 5.1; danh sách sắp hết (UC7) là bộ lọc của Màn hình 1.
const ROUTES = {
  '/ton-kho': { title: 'Tồn kho', page: StockPage },
  '/xuat-kho': { title: 'Xuất linh kiện', page: ExportPage, role: 'TECHNICIAN' },
  '/nhap-kho': { title: 'Nhập kho', page: ImportPage, role: 'MANAGER' },
};
const ROLE_NAME = { TECHNICIAN: 'Kỹ thuật viên', MANAGER: 'Quản lý' };

// Đọc phần sau dấu # trên thanh địa chỉ, ví dụ #/ton-kho?low=1 → path "/ton-kho", params low=1.
// Dùng hash nên không cần cấu hình máy chủ: tải lại trang vẫn đúng màn hình.
function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  return { path: path || '/ton-kho', params: new URLSearchParams(query) };
}

// Đọc localStorage một lần mỗi lần phiên đổi, để useSyncExternalStore nhận cùng một đối tượng.
let snapshot = session.get();
session.subscribe(() => { snapshot = session.get(); });

export default function App() {
  const user = useSyncExternalStore(session.subscribe, () => snapshot);
  const { path, params } = useHash();

  // Chưa đăng nhập (hoặc token hết hạn bị xoá) thì chỉ hiện trang đăng nhập.
  if (!user) return <main className="container"><LoginPage /></main>;

  const route = ROUTES[path] || ROUTES['/ton-kho'];
  const Page = route.page;
  return (
    <>
      <header className="topbar">
        <strong>SmartCRM · Kho phụ tùng</strong>
        {/* Chỉ hiện menu đúng vai trò: kỹ thuật viên không thấy Nhập kho, quản lý không thấy Xuất linh kiện */}
        <nav>
          {Object.entries(ROUTES).filter(([, r]) => !r.role || r.role === user.role).map(([p, r]) => (
            <a key={p} href={`#${p}`} className={p === path ? 'active' : undefined}>{r.title}</a>
          ))}
        </nav>
        <span className="who">
          {user.fullName || ROLE_NAME[user.role]} · {centerLabel(user)}
          <button type="button" onClick={() => session.clear()}>Đăng xuất</button>
        </span>
      </header>
      <main className="container">
        {/* key: đổi trang thì dựng lại, không giữ state của trang trước */}
        <Page key={path + params} user={user} params={params} />
      </main>
    </>
  );
}
