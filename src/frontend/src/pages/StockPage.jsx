// Màn hình 1 – Tồn kho linh kiện (UC1, UC7, UC9), bố cục theo wireframe BT1 mục 5.1.
// Câu hỏi của người dùng: "Linh kiện tôi cần còn bao nhiêu, có sắp hết không?"
import { useState } from 'react';
import { stockApi } from '../api/stock.api.js';
import { centerLabel } from '../api/stock.view.js';
import { useApi } from '../hooks/useApi.js';
import { DataState } from '../components/DataState.jsx';
import { WarningBadge } from '../components/WarningBadge.jsx';
import { ErrorLine } from '../components/ErrorLine.jsx';
import { fieldErrors } from '../components/ErrorBox.jsx';

export default function StockPage({ user, params }) {
  // #/ton-kho?low=1 mở sẵn bộ lọc sắp hết (liên kết từ Màn hình 2).
  const initial = { q: '', lowOnly: params.get('low') === '1', page: 1 };
  // draft: giá trị đang gõ trên ô lọc; filters: giá trị đã bấm Lọc. Chỉ filters đổi mới gọi API,
  // nên gõ từng chữ không gửi một loạt yêu cầu lên máy chủ.
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [editing, setEditing] = useState(null); // dòng đang sửa ngưỡng
  const isManager = user.role === 'MANAGER';

  const filtered = Boolean(filters.q || filters.lowOnly);
  // useApi lo ba trạng thái đang tải / lỗi / có dữ liệu; mảng cuối là các giá trị mà khi đổi thì gọi lại API.
  const { data, loading, error, reload } = useApi(async () => {
    const page = await stockApi.search(user.centerId, filters);
    // Mốc so sánh "trung tâm có N dòng tồn": khi có lọc thì hỏi thêm tổng không lọc.
    const centerTotal = filtered ? (await stockApi.search(user.centerId, {})).totalItems : page.totalItems;
    return { ...page, centerTotal };
  }, [user.centerId, filters.q, filters.lowOnly, filters.page]);

  const clear = () => { setDraft({ q: '', lowOnly: false, page: 1 }); setFilters({ q: '', lowOnly: false, page: 1 }); };

  return (
    <section className="screen">
      <h1>Tồn kho linh kiện</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setFilters({ ...draft, page: 1 }); }}>
        <label className="field">Tìm (mã/tên)
          <input type="search" maxLength={50} value={draft.q} placeholder="pin"
            onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
        </label>
        <label className="field">Trung tâm
          <input className="wide" value={centerLabel(user)} readOnly />
        </label>
        <label className="check">
          <input type="checkbox" checked={draft.lowOnly}
            onChange={(e) => setDraft({ ...draft, lowOnly: e.target.checked })} />
          Chỉ hiện sắp hết / hết hàng
        </label>
        <button type="submit">Lọc</button>
      </form>

      {/* DataState hiện đúng một trong: đang tải, lỗi (có nút Thử lại), rỗng (có gợi ý), hoặc bảng dữ liệu */}
      <DataState
        loading={loading} error={error} onRetry={reload} isEmpty={data?.rows.length === 0}
        empty={filtered
          ? { title: `Không có linh kiện nào khớp${filters.q ? ` “${filters.q}”` : ''}${filters.lowOnly ? ' trong nhóm sắp hết' : ''}.`,
              hint: 'Thử từ khoá ngắn hơn hoặc bỏ chọn “Chỉ hiện sắp hết / hết hàng”.',
              action: <button type="button" onClick={clear}>Xoá bộ lọc</button> }
          : { title: 'Trung tâm chưa có dòng tồn nào.',
              hint: 'Dòng tồn được nạp từ dataset (npm run seed ở backend).' }}
      >
        {() => (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Mã LK</th><th>Tên linh kiện</th><th className="num">Tồn</th><th className="num">Ngưỡng</th>
                  <th className="num">Đơn giá</th><th>Cảnh báo</th>{isManager && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.partCode} className={r.warning ? 'row-warn' : undefined}>
                    <td data-label="Mã LK">{r.partCode}</td>
                    <td data-label="Tên linh kiện">{r.partName}</td>
                    <td data-label="Tồn" className="num">{r.quantity}</td>
                    <td data-label="Ngưỡng" className="num">{r.minThreshold}</td>
                    <td data-label="Đơn giá" className="num">{r.unitPriceText}</td>
                    <td data-label="Cảnh báo">{r.warning ? <WarningBadge warning={r.warning} /> : '—'}</td>
                    {isManager && (
                      <td data-label="Thao tác">
                        <button type="button" className="link" onClick={() => setEditing(r)}>[Sửa ngưỡng]</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Phân trang: 20 dòng mỗi trang, số liệu tổng lấy từ phản hồi của API (EP1) */}
            <div className="pager">
              <button type="button" disabled={data.page <= 1}
                onClick={() => setFilters({ ...filters, page: data.page - 1 })}>‹ Trước</button>
              <button type="button" disabled={data.page >= data.totalPages}
                onClick={() => setFilters({ ...filters, page: data.page + 1 })}>Sau ›</button>
              <span>
                Trang {data.page}/{data.totalPages} · {data.pageSize} dòng mỗi trang · Tổng: {data.totalItems} linh kiện
                {filtered ? ' khớp' : ''}, {data.lowCount} dưới ngưỡng (trung tâm có {data.centerTotal} dòng tồn)
              </span>
            </div>
          </>
        )}
      </DataState>

      {isManager && editing && (
        <ThresholdForm key={editing.partCode} user={user} row={editing}
          onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      )}
    </section>
  );
}

// SỬA NGƯỠNG (UC9): hiện khi bấm [Sửa ngưỡng]; chỉ Quản lý trung tâm.
function ThresholdForm({ user, row, onDone, onCancel }) {
  const [value, setValue] = useState(String(row.minThreshold));
  const [state, setState] = useState({ saving: false, error: null });

  async function save(e) {
    e.preventDefault();
    setState({ saving: true, error: null });
    try {
      // Gửi số, không gửi chuỗi: API từ chối "10" (api-contract.md mục 1.7). Ô trống → null → API báo lỗi.
      await stockApi.setThreshold(user.centerId, row.partCode, value.trim() === '' ? null : Number(value));
      onDone();
    } catch (error) {
      setState({ saving: false, error });
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <h2>Sửa ngưỡng</h2>
      <div className="row">
        <label className="field grow">Linh kiện
          <input value={`${row.partCode} - ${row.partName}`} readOnly />
        </label>
        <label className="field">Ngưỡng mới
          <input type="number" step="1" value={value} autoFocus className="short"
            onChange={(e) => setValue(e.target.value)} />
        </label>
        <button type="submit" className="btn-ok" disabled={state.saving}>Lưu</button>
        <button type="button" onClick={onCancel}>Hủy</button>
      </div>
      <ErrorLine error={state.error}>{fieldErrors(state.error).min_threshold && 'Ngưỡng phải là số nguyên ≥ 0.'}</ErrorLine>
    </form>
  );
}
