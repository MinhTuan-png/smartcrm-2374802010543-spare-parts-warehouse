// Thông báo lỗi ba phần: chuyện gì · vì sao · làm gì tiếp. Rẽ nhánh theo error.code, không theo câu chữ.
const NEXT_STEP = {
  NETWORK: 'Kiểm tra mạng hoặc nhờ quản trị khởi động backend, rồi bấm Thử lại.',
  FORBIDDEN: 'Nếu bạn cần quyền này, liên hệ quản lý trung tâm.',
  INTERNAL_ERROR: 'Thử lại sau ít phút. Nếu vẫn lỗi, gửi mã tra cứu cho bộ phận kỹ thuật.',
};

// onRetry: hàm gọi lại API; nút Thử lại chỉ hiện với lỗi tạm thời (mất mạng, lỗi máy chủ).
export function ErrorBox({ error, onRetry }) {
  const retryable = ['NETWORK', 'INTERNAL_ERROR'].includes(error.code);
  return (
    <div className="alert alert-error" role="alert">
      <p className="alert-title">{error.message}</p>
      {NEXT_STEP[error.code] && <p>{NEXT_STEP[error.code]}</p>}
      {retryable && onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}

/** Lỗi theo trường (400 VALIDATION_FAILED) để hiện ngay cạnh ô nhập. */
export const fieldErrors = (error) =>
  error?.code === 'VALIDATION_FAILED' && Array.isArray(error.details)
    ? Object.fromEntries(error.details.map((d) => [d.field, d.reason]))
    : {};
