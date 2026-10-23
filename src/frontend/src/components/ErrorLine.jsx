// Một dòng lỗi như wireframe: câu cho người dùng + "Mã lỗi <HTTP> <code>" để báo kỹ thuật.
// Lỗi mạng không có mã HTTP nên chỉ hiện câu.
export function ErrorLine({ error, children }) {
  if (!error) return null;
  return (
    <p className="error-line" role="alert">
      {children || error.message}
      {error.status > 0 && <> Mã lỗi {error.status} {error.code}</>}
    </p>
  );
}
