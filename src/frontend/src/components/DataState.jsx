// Ba trạng thái mọi màn hình phải có: ĐANG TẢI · RỖNG · LỖI. Trang chỉ viết phần "có dữ liệu".
import { ErrorBox } from './ErrorBox.jsx';

/**
 * @param {{loading:boolean, error:any, isEmpty:boolean, onRetry:() => void,
 *          empty:{title:string, hint?:string, action?:any}, children:() => any}} props
 */
export function DataState({ loading, error, isEmpty, onRetry, empty, children }) {
  if (loading) {
    return (
      <div className="skeleton" role="status" aria-live="polite">
        <span className="sr-only">Đang tải dữ liệu tồn kho…</span>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton-row" />)}
      </div>
    );
  }
  if (error) return <ErrorBox error={error} onRetry={onRetry} />;
  if (isEmpty) {
    return (
      <div className="empty-state">
        <p className="empty-title">{empty.title}</p>
        {empty.hint && <p className="muted">{empty.hint}</p>}
        {empty.action}
      </div>
    );
  }
  return children();
}
