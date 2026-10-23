// Màn hình 3 – Nhập kho (UC6), bố cục theo wireframe BT1 mục 5.1. Chỉ quản lý.
// Câu hỏi của người dùng: "Nhập xong đã đủ hàng chưa, còn dưới ngưỡng không?"
// Phần "Lịch sử giao dịch kho" (UC8, COULD) chưa làm.
import { useState } from 'react';
import { stockApi } from '../api/stock.api.js';
import { formatDate } from '../api/stock.view.js';
import { ErrorBox, fieldErrors } from '../components/ErrorBox.jsx';
import { ErrorLine } from '../components/ErrorLine.jsx';
import { WarningBadge } from '../components/WarningBadge.jsx';
import { PartPicker } from '../components/PartPicker.jsx';

export default function ImportPage({ user, params }) {
  // #/nhap-kho?part=...&qty=... điền sẵn mã linh kiện và số lượng.
  const initial = { partCode: params.get('part') || '', quantity: params.get('qty') || '1' };
  const [form, setForm] = useState(initial);
  const [stock, setStock] = useState(null);
  const [state, setState] = useState({ sending: false, error: null, result: null });

  if (user.role !== 'MANAGER') {
    return <ErrorBox error={{ code: 'FORBIDDEN', message: 'Chỉ quản lý trung tâm mới được ghi nhập kho.' }} />;
  }

  // [Ghi nhập kho]: gọi EP3, backend cộng tồn và ghi một dòng NHAP vào sổ giao dịch trong cùng giao dịch.
  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null, result: null });
    try {
      const result = await stockApi.importPart(user.centerId, {
        partCode: form.partCode.trim(), quantity: Number(form.quantity),
      });
      setState({ sending: false, error: null, result });
      setStock({ loading: false, data: result.stock, error: null });
    } catch (error) {
      setState({ sending: false, error, result: null });
    }
  }

  const cancel = () => { setForm({ partCode: '', quantity: '1' }); setState({ sending: false, error: null, result: null }); };
  const errs = fieldErrors(state.error);
  const s = stock?.data;
  const r = state.result;

  return (
    <section className="screen">
      <h1>Nhập kho</h1>
      <form onSubmit={submit} noValidate>
        <div className="row">
          <label className="field grow">Linh kiện
            <PartPicker centerId={user.centerId} value={form.partCode}
              onChange={(partCode) => setForm({ ...form, partCode })} onStock={setStock} />
          </label>
          <label className="field">Tồn hiện tại
            <input className="short" value={stock?.loading ? '…' : s?.quantity ?? ''} readOnly />
          </label>
          <label className="field">Ngưỡng
            <input className="short" value={s?.minThreshold ?? ''} readOnly />
          </label>
          <label className="field">Số lượng nhập
            <input className="short" type="number" min="1" max="9999" step="1" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <button type="submit" className="btn-ok" disabled={state.sending}>
            {state.sending ? 'Đang ghi…' : 'Ghi nhập kho'}
          </button>
          <button type="button" onClick={cancel}>Hủy</button>
          <span className="muted">Khi ghi thành công: tồn mới = tồn hiện tại + số lượng nhập.</span>
        </div>
        {stock?.error && <ErrorLine error={stock.error} />}
        {errs.quantity && <ErrorLine error={state.error}>Số lượng nhập phải là số nguyên từ 1 đến 9999.</ErrorLine>}
        {errs.part_code && <ErrorLine error={state.error}>{errs.part_code}</ErrorLine>}
        {state.error?.code === 'INTERNAL_ERROR' && (
          <ErrorLine error={state.error}>Hệ thống gặp lỗi, tồn và giao dịch không đổi. Vui lòng thử lại.</ErrorLine>
        )}
        {state.error && !['VALIDATION_FAILED', 'INTERNAL_ERROR'].includes(state.error.code) && <ErrorLine error={state.error} />}
      </form>

      {/* Kết quả: tồn mới và còn dưới ngưỡng hay không, để quản lý biết đã nhập đủ chưa */}
      {r && (
        <p className={r.stock.warning ? 'notice notice-warn' : 'notice notice-ok'} role="status">
          Đã nhập {r.quantity} × {r.stock.partCode} ngày {formatDate(r.date)}.
          Tồn mới = <strong>{r.stock.quantity}</strong> (ngưỡng {r.stock.minThreshold}) <WarningBadge warning={r.stock.warning} />
          {r.stock.warning && <> Vẫn dưới ngưỡng: cần nhập thêm {r.stock.shortage} để hết cảnh báo.</>}
        </p>
      )}
    </section>
  );
}
