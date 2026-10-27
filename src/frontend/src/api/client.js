// LỚP GỌI API: một chỗ duy nhất biết về HTTP (base URL, token, định dạng lỗi).
// Component và trang không bao giờ gọi fetch trực tiếp; mọi lệnh gọi đi qua đây.
import { session } from './session.js';

// KHÔNG ghi cứng URL trong mã. Để trống khi chạy bằng Docker: giao diện gọi /api cùng nguồn, nginx chuyển sang backend.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
// Máy chủ không trả lời trong khoảng này thì báo lỗi để người dùng bấm Thử lại, không quay "Đang tải..." mãi.
const TIMEOUT_MS = 20000;

/** Lỗi đã dịch sang ngôn ngữ của ứng dụng. Giao diện rẽ nhánh theo `code`, không theo câu chữ. */
export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;   // mã HTTP; 0 = không kết nối được máy chủ
    this.code = code;       // error.code của backend (docs/api-contract.md mục 1.1)
    this.details = details; // error.details: danh sách trường sai, tồn hiện có...
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  const token = session.token();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // Không hiện "TypeError: Failed to fetch": nói chuyện gì, vì sao, làm gì tiếp.
    throw new ApiError(0, 'NETWORK', e?.name === 'TimeoutError'
      ? 'Máy chủ kho không phản hồi.'
      : 'Không kết nối được tới máy chủ kho.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* phản hồi không phải JSON */ }

  if (!res.ok) {
    // 401: token hết hạn hoặc sai → xoá token, về trang đăng nhập, không để người dùng kẹt ở màn lỗi.
    if (res.status === 401) session.clear();
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL_ERROR',
      e?.message ?? 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.', e?.details ?? null);
  }
  return data;
}
