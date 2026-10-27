// Ghi log dạng JSON, mỗi dòng một sự kiện, ra STDOUT (đọc bằng `docker compose logs api`).
// Không ghi ra tệp: tệp log nằm trong container sẽ mất khi container bị xoá.
// Mỗi dòng có: thời điểm ISO (time), mức (level), thông điệp (msg) và ngữ cảnh (requestId, mã lỗi...).
// TUYỆT ĐỐI KHÔNG ghi mật khẩu, token, chuỗi kết nối, số điện thoại: các trường đó bị thay bằng '***'.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

// Tên trường (không phân biệt hoa thường, khớp một phần) bị che trước khi ghi.
const SENSITIVE = ['password', 'mat_khau', 'token', 'jwt', 'authorization', 'secret',
  'connectionstring', 'database_url', 'phone', 'so_dien_thoai', 'sodienthoai'];

/** Chép sâu `value`, thay giá trị của trường nhạy cảm bằng '***'; Error chuyển thành {name, message, code, stack}. */
function mask(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code, stack: value.stack };
  }
  const out = Array.isArray(value) ? [] : {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE.some((s) => k.toLowerCase().includes(s)) ? '***' : mask(v);
  }
  return out;
}

/**
 * @param {{level?: string, write?: (line: string) => void}} [opts]
 *   level: mức thấp nhất được ghi (mặc định LOG_LEVEL hoặc 'info'); write: nơi ghi (mặc định stdout, test thay được).
 */
function createLogger({ level = process.env.LOG_LEVEL || 'info', write = (s) => process.stdout.write(s) } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const log = (lvl) => (msg, context = {}) => {
    if (LEVELS[lvl] < min) return;
    write(`${JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...mask(context) })}\n`);
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

const logger = createLogger();

module.exports = { logger, createLogger, mask };
