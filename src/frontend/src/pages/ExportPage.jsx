// Màn hình 2 – Xuất linh kiện cho phiếu (UC2, UC3, UC4, UC10), bố cục theo wireframe BT1 mục 5.1.
// Chỉ kỹ thuật viên. Câu hỏi của người dùng: "Xuất xong tồn còn bao nhiêu, phiếu đã dùng những gì?"
// Nút "Báo thiếu linh kiện" (UC5, SHOULD) chưa làm nên để khoá.
import { useState } from 'react';
import { stockApi, ticketApi } from '../api/stock.api.js';
import { centerLabel, formatDate } from '../api/stock.view.js';
import { ErrorBox, fieldErrors } from '../components/ErrorBox.jsx';
import { ErrorLine } from '../components/ErrorLine.jsx';
import { WarningBadge } from '../components/WarningBadge.jsx';
import { PartPicker } from '../components/PartPicker.jsx';

const EMPTY_ITEM = { partCode: '', quantity: '1' };

export default function ExportPage({ user }) {
  const [code, setCode] = useState('');
  // Mỗi khối dữ liệu có 3 trạng thái riêng: phiếu, linh kiện đã dùng, dòng tồn đang chọn, kết quả xuất.
  const [ticket, setTicket] = useState({ loading: false, data: null, error: null });
  const [used, setUsed] = useState({ loading: false, data: null, error: null });
  const [item, setItem] = useState(EMPTY_ITEM);
  const [stock, setStock] = useState(null);
  const [state, setState] = useState({ sending: false, error: null, result: null });

  if (user.role !== 'TECHNICIAN') {
    return <ErrorBox error={{ code: 'FORBIDDEN', message: 'Chỉ kỹ thuật viên mới được xuất linh kiện cho phiếu.' }} />;
  }

  // [Tra cứu]: đọc phiếu và danh sách linh kiện đã dùng (UC2 bước 2, UC10).
  async function lookup(ticketCode = code.trim()) {
    setTicket({ loading: true, data: null, error: null });
    setUsed({ loading: true, data: null, error: null });
    try {
      setTicket({ loading: false, data: await ticketApi.get(ticketCode), error: null });
    } catch (error) {
      setTicket({ loading: false, data: null, error });
      setUsed({ loading: false, data: null, error: null });
      return;
    }
    try {
      setUsed({ loading: false, data: await ticketApi.usedParts(ticketCode), error: null });
    } catch (error) {
      setUsed({ loading: false, data: null, error });
    }
  }

  // [Xuất linh kiện]: gọi EP2. Backend khoá dòng tồn trong giao dịch nên hai người xuất cùng lúc không làm tồn âm.
  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null, result: null });
    try {
      const result = await stockApi.exportPart(user.centerId, {
        ticketCode: code.trim(), partCode: item.partCode.trim(), quantity: Number(item.quantity),
      });
      setState({ sending: false, error: null, result });
      // Tồn mới lấy từ phản hồi, không cần gọi lại; phản hồi EP2 không có đơn giá nên giữ đơn giá đang hiện.
      setStock((prev) => ({ loading: false, error: null,
        data: { ...result.stock, unitPriceText: prev?.data?.unitPriceText ?? null } }));
      lookup(result.ticketCode); // bảng linh kiện đã dùng có thêm dòng vừa xuất
    } catch (error) {
      setState({ sending: false, error, result: null }); // giữ nguyên dữ liệu đã nhập
    }
  }

  const cancel = () => { setItem(EMPTY_ITEM); setState({ sending: false, error: null, result: null }); };
  const errs = fieldErrors(state.error);
  const t = ticket.data;
  const s = stock?.data;

  return (
    <section className="screen">
      <h1>Xuất linh kiện cho phiếu</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
        <label className="field">Mã phiếu
          <input value={code} placeholder="BH-000002/2025" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </label>
        <button type="submit" className="btn-info" disabled={ticket.loading}>Tra cứu</button>
        <label className="field">Trạng thái
          <input value={ticket.loading ? 'Đang tra cứu…' : t?.status ?? ''} readOnly />
        </label>
        <label className="field">Trung tâm
          <input className="wide" value={centerLabel(user)} readOnly />
        </label>
      </form>
      <div className="row">
        <label className="field grow">Mô tả lỗi
          <input value={t?.issueDesc ?? ''} readOnly />
        </label>
      </div>
      <ErrorLine error={ticket.error} />
      {t && !t.exportable && (
        <p className="error-line">Phiếu đang ở “{t.status}”: chỉ xuất khi phiếu Đang xử lý hoặc Chờ linh kiện (QT-L5-02).</p>
      )}

      <form onSubmit={submit} noValidate>
        <h2>Xuất linh kiện</h2>
        <div className="row">
          <label className="field grow">Linh kiện
            <PartPicker centerId={user.centerId} value={item.partCode}
              onChange={(partCode) => setItem({ ...item, partCode })} onStock={setStock} />
          </label>
          <label className="field">Tồn hiện tại
            <input className="short" value={stock?.loading ? '…' : s?.quantity ?? ''} readOnly />
          </label>
          <label className="field">Số lượng xuất
            <input className="short" type="number" min="1" max="9999" step="1" value={item.quantity}
              onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
          </label>
          <label className="field">Đơn giá
            <input value={s?.unitPriceText ?? ''} readOnly />
          </label>
        </div>
        {stock?.error && <ErrorLine error={stock.error} />}
        {Object.keys(errs).length > 0 && (
          <ErrorLine error={state.error}>{Object.values(errs).join(' ')}</ErrorLine>
        )}
        {state.error && state.error.code !== 'VALIDATION_FAILED' && <ExportError error={state.error} />}

        <div className="row">
          <button type="submit" className="btn-ok" disabled={state.sending}>
            {state.sending ? 'Đang xuất…' : 'Xuất linh kiện'}
          </button>
          <button type="button" className="btn-warn" disabled title="Báo thiếu linh kiện (UC5) sẽ bổ sung sau">
            Báo thiếu linh kiện
          </button>
          <button type="button" onClick={cancel}>Hủy</button>
          {!state.result && <span className="muted">Sau khi xuất: tồn còn lại và cảnh báo sắp hết hiện ngay bên dưới.</span>}
        </div>
      </form>
      {state.result && <ExportResult r={state.result} />}

      <h2>Linh kiện đã dùng trên phiếu</h2>
      <UsedParts state={used} />
    </section>
  );
}

// 409 và 422 là lỗi nghiệp vụ: nói rõ vì sao và làm gì tiếp, dùng số liệu trong details.
function ExportError({ error }) {
  const d = error.details;
  if (error.code === 'INSUFFICIENT_STOCK') {
    return (
      <ErrorLine error={error}>
        Tồn kho không đủ (còn {d.available_quantity}, yêu cầu {d.requested_quantity}). Giảm số lượng hoặc báo thiếu linh kiện.
      </ErrorLine>
    );
  }
  if (error.code === 'TICKET_STATE_INVALID') {
    return (
      <ErrorLine error={error}>
        Phiếu đang ở “{d.current_status}”, chỉ xuất khi phiếu ở {d.allowed_statuses.map((x) => `“${x}”`).join(' hoặc ')}.
      </ErrorLine>
    );
  }
  if (error.code === 'INTERNAL_ERROR') {
    return <ErrorLine error={error}>Hệ thống gặp lỗi, tồn và giao dịch không đổi. Vui lòng thử lại.</ErrorLine>;
  }
  return <ErrorLine error={error} />;
}

function ExportResult({ r }) {
  return (
    <p className={r.stock.warning ? 'notice notice-warn' : 'notice notice-ok'} role="status">
      Đã xuất {r.quantity} × {r.stock.partCode} cho phiếu {r.ticketCode} ngày {formatDate(r.date)}.
      Tồn còn <strong>{r.stock.quantity}</strong> (ngưỡng {r.stock.minThreshold}) <WarningBadge warning={r.stock.warning} />
      {r.stock.warning && <> <a href="#/ton-kho?low=1">Xem danh sách sắp hết</a></>}
    </p>
  );
}

// LINH KIỆN ĐÃ DÙNG TRÊN PHIẾU (UC10): ba trạng thái nằm ngay trong bảng.
function UsedParts({ state }) {
  const { loading, data, error } = state;
  let body;
  if (loading) body = <tr><td colSpan={6} className="muted">Đang tải linh kiện đã dùng…</td></tr>;
  else if (error) body = <tr><td colSpan={6}><ErrorLine error={error} /></td></tr>;
  else if (!data) body = <tr><td colSpan={6} className="muted">Nhập mã phiếu và bấm Tra cứu để xem linh kiện đã dùng.</td></tr>;
  else if (data.rows.length === 0) {
    body = (
      <tr><td>—</td><td>—</td><td>Chưa có linh kiện nào được xuất cho phiếu này</td><td>—</td><td>—</td><td>—</td></tr>
    );
  } else {
    body = data.rows.map((r) => (
      <tr key={r.id}>
        <td data-label="Ngày">{formatDate(r.date)}</td>
        <td data-label="Mã LK">{r.partCode}</td>
        <td data-label="Tên linh kiện">{r.partName}</td>
        <td data-label="Số lượng" className="num">{r.quantity}</td>
        <td data-label="Đơn giá" className="num">{r.unitPriceText}</td>
        <td data-label="Thành tiền" className="num">{r.lineTotalText}</td>
      </tr>
    ));
  }
  return (
    <table className="table">
      <thead>
        <tr><th>Ngày</th><th>Mã LK</th><th>Tên linh kiện</th><th className="num">Số lượng</th>
          <th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr>
      </thead>
      <tbody>
        {body}
        {data && (
          <tr className="total">
            <td /><td /><td data-label="">Tổng cộng</td><td /><td />
            <td data-label="Tổng cộng" className="num"><strong>{data.totalText}</strong></td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
