// Lớp 2 (API): kiểm tra dữ liệu ở RANH GIỚI. Đây là hợp đồng đầu vào viết bằng mã (zod),
// khớp bảng validation ở docs/api-contract.md mục 1.7. Qua được đây thì service nhận dữ liệu
// đã sạch, không phải rải if kiểm tra kiểu trong lớp nghiệp vụ.
const { z } = require('zod');
const { AppError } = require('../errors');

const PART_CODE = /^[A-Z0-9-]{5,30}$/;   // theo parts.csv, ví dụ MH-AP-03
const TICKET_CODE = /^BH-\d{6}\/\d{4}$/; // ví dụ BH-000002/2025

// Không dùng z.number() thường vì nó nhận 2.5; không dùng z.coerce vì nó nhận chuỗi "2".
const integer = (min, max, reason) =>
  z.any().refine((v) => Number.isInteger(v) && v >= min && v <= max, { message: reason });

const page = z.string().regex(/^[1-9]\d*$/, 'Phải là số nguyên ≥ 1.').optional()
  .transform((v) => (v === undefined ? 1 : Number(v)));

const partCode = z.string({ error: 'Bắt buộc, dạng chữ hoa, số và dấu gạch ngang (5–30 ký tự).' })
  .regex(PART_CODE, 'Bắt buộc, dạng chữ hoa, số và dấu gạch ngang (5–30 ký tự).');

const quantity = integer(1, 9999, 'Phải là số nguyên từ 1 đến 9999.');

const schemas = {
  // EP1
  stockQuery: z.object({
    q: z.string({ error: 'Phải là chuỗi.' }).trim().max(50, 'Tối đa 50 ký tự.').optional()
      .transform((v) => v || ''),
    low_only: z.enum(['true', 'false'], { error: 'Chỉ nhận true hoặc false.' }).optional()
      .transform((v) => v === 'true'),
    page,
  }),
  // EP4
  lowQuery: z.object({ page }),
  // EP2
  exportBody: z.object({
    ticket_code: z.string({ error: 'Bắt buộc, dạng BH-000002/2025.' })
      .regex(TICKET_CODE, 'Bắt buộc, dạng BH-000002/2025.'),
    part_code: partCode,
    quantity,
  }),
  // EP3
  importBody: z.object({ part_code: partCode, quantity }),
  // EP6
  thresholdBody: z.object({ min_threshold: integer(0, 2147483647, 'Phải là số nguyên ≥ 0.') }),
  partCodeParam: z.object({ partCode }),
  // EP-L2, EP8
  ticketCodeParam: z.object({
    ticketCode: z.string().regex(TICKET_CODE, 'Bắt buộc, dạng BH-000002/2025.'),
  }),
  // Đăng nhập: chỉ kiểm tra có giá trị, không gợi ý quy tắc mật khẩu cho người đoán.
  loginBody: z.object({
    username: z.string({ error: 'Bắt buộc.' }).trim().min(1, 'Bắt buộc.').max(50, 'Tối đa 50 ký tự.'),
    password: z.string({ error: 'Bắt buộc.' }).min(1, 'Bắt buộc.').max(100, 'Tối đa 100 ký tự.'),
  }),
};

/**
 * Kiểm tra `input` theo schema; trả dữ liệu đã chuẩn hoá.
 * @throws {AppError} VALIDATION_FAILED, details = [{ field, reason }] để giao diện hiện lỗi cạnh từng ô.
 */
// Tham số đường dẫn viết camelCase trong Express; lỗi trả về theo tên trường của API.
const PARAM_FIELD = { partCode: 'part_code', ticketCode: 'ticket_code' };

function validate(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({
    field: PARAM_FIELD[i.path.join('.')] ?? i.path.join('.'),
    reason: i.message,
  }));
  throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', details);
}

module.exports = { schemas, validate };
