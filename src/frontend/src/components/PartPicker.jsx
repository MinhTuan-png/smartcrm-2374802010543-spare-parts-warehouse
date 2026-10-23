// Ô chọn linh kiện ở Màn hình 2, 3: gõ mã hoặc tên, danh sách gợi ý lấy từ EP1 (20 dòng đầu khớp).
// Chọn xong thì đọc dòng tồn để hiện tồn hiện tại, ngưỡng, đơn giá trước khi gửi.
import { useEffect, useState } from 'react';
import { stockApi } from '../api/stock.api.js';

const PART_CODE = /^[A-Z0-9-]{5,30}$/;

/**
 * @param {{centerId:number, value:string, onChange:(code:string) => void,
 *          onStock:(state:{loading:boolean, data:any, error:any}|null) => void}} props
 */
export function PartPicker({ centerId, value, onChange, onStock }) {
  const [options, setOptions] = useState([]);

  // Gợi ý theo chữ đang gõ; đợi người dùng ngừng gõ 250 ms để không gọi API mỗi phím.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      stockApi.search(centerId, { q: value })
        .then((p) => { if (!cancelled) setOptions(p.rows); })
        .catch(() => { if (!cancelled) setOptions([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [centerId, value]);

  // Mã đủ định dạng thì đọc dòng tồn; sai định dạng thì xoá ô tồn hiện tại.
  useEffect(() => {
    if (!PART_CODE.test(value)) { onStock(null); return undefined; }
    let cancelled = false;
    onStock({ loading: true, data: null, error: null });
    stockApi.one(centerId, value)
      .then((data) => { if (!cancelled) onStock({ loading: false, data, error: null }); })
      .catch((error) => { if (!cancelled) onStock({ loading: false, data: null, error }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, value]);

  return (
    <>
      <input
        list="part-options" value={value} placeholder="Gõ mã hoặc tên, ví dụ PIN" aria-label="Linh kiện"
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <datalist id="part-options">
        {options.map((o) => <option key={o.partCode} value={o.partCode}>{o.partCode} - {o.partName}</option>)}
      </datalist>
    </>
  );
}
