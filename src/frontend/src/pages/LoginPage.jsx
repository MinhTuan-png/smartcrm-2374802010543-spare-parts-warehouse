// Đăng nhập bằng tài khoản (bảng app_user, TD-14). Tài khoản mẫu do `npm run seed` tạo:
// ktv<mã trung tâm> / quanly<mã trung tâm>, mật khẩu là DEMO_PASSWORD trong .env của backend.
import { useState } from 'react';
import { authApi } from '../api/stock.api.js';
import { session } from '../api/session.js';
import { ErrorBox, fieldErrors } from '../components/ErrorBox.jsx';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [state, setState] = useState({ sending: false, error: null });

  // Gửi tên đăng nhập + mật khẩu; thành công thì lưu phiên (token, vai trò, trung tâm) rồi vào màn Tồn kho.
  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null });
    try {
      session.save(await authApi.login(form.username.trim(), form.password));
      window.location.hash = '#/ton-kho';
    } catch (error) {
      setState({ sending: false, error });
      setForm({ ...form, password: '' }); // không giữ mật khẩu sai trên màn hình
    }
  }

  const errs = fieldErrors(state.error); // lỗi 400 theo từng ô nhập, hiện ngay dưới ô đó
  return (
    <section className="card narrow">
      <h1>Đăng nhập kho phụ tùng</h1>
      <form onSubmit={submit} className="form" noValidate>
        <label>Tên đăng nhập
          <input value={form.username} autoComplete="username" placeholder="ktv2" autoFocus
            onChange={(e) => setForm({ ...form, username: e.target.value })} />
          {errs.username && <span className="field-error">{errs.username}</span>}
        </label>
        <label>Mật khẩu
          <input type="password" value={form.password} autoComplete="current-password"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {errs.password && <span className="field-error">{errs.password}</span>}
        </label>
        <button type="submit" className="primary" disabled={state.sending}>
          {state.sending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
      {state.error && state.error.code !== 'VALIDATION_FAILED' && <ErrorBox error={state.error} />}
    </section>
  );
}
