// Nhãn cảnh báo tồn (QT-09). null = đủ hàng.
export function WarningBadge({ warning }) {
  if (!warning) return <span className="badge badge-ok">ĐỦ HÀNG</span>;
  return <span className={warning === 'HẾT HÀNG' ? 'badge badge-out' : 'badge badge-low'}>{warning}</span>;
}
