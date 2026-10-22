// Nạp phiếu (bảng của L2, L5 chỉ đọc) và sổ giao dịch kho lịch sử từ dataset, để EP2 có phiếu thật.
// Cả hai file là TUỲ CHỌN: thiếu file thì bỏ qua và báo, không làm hỏng seed danh mục.
// Không đụng tới part_stock: part_stock.csv đã là tồn hiện tại, giao dịch lịch sử chỉ để tra cứu.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Tên header có thể khác giữa các bản dataset: liệt kê các tên chấp nhận, lấy tên đầu tiên có trong file.
// Nếu file của bạn dùng tên khác, thêm vào đây (seed sẽ in header thật để đối chiếu).
const TICKET_COL = {
  code: ['ticket_code', 'ma_phieu'],
  center: ['center_id'],
  status: ['status', 'trang_thai'],
  desc: ['issue_desc', 'mo_ta_loi', 'mo_ta', 'description'],
};
const TXN_COL = {
  id: ['transaction_id'],
  center: ['center_id'],
  part: ['part_id'],
  loai: ['loai', 'type'],
  qty: ['so_luong', 'quantity'],
  ngay: ['ngay', 'transaction_date'],
  ticket: ['ticket_code', 'ma_phieu'],
};

// Dataset có thể ghi trạng thái bằng mã hoặc bằng tên có dấu; CSDL lưu mã (CHECK ở migration 001).
const STATUS_CODE = {
  'mới': 'MOI', 'đã phân công': 'DA_PHAN_CONG', 'đang xử lý': 'DANG_XU_LY',
  'chờ linh kiện': 'CHO_LINH_KIEN', 'hoàn tất': 'HOAN_TAT', 'đã đóng': 'DA_DONG', 'đã hủy': 'DA_HUY',
};
const toStatusCode = (v) => {
  const s = String(v).trim();
  return STATUS_CODE[s.toLowerCase().normalize('NFC')] || s.toUpperCase();
};

function readOptional(dir, file) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) return null;
  return parse(fs.readFileSync(full, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });
}

// Trả { key: tênCộtThật } hoặc ném lỗi nêu rõ header thật của file để sửa bảng tên ở trên.
function resolveColumns(rows, wanted, file, optional = []) {
  const headers = Object.keys(rows[0] || {});
  const found = {};
  for (const [key, names] of Object.entries(wanted)) {
    found[key] = names.find((n) => headers.includes(n));
    if (!found[key] && !optional.includes(key)) {
      throw new Error(`${file}: không thấy cột ${names.join(' / ')}. Header thật: ${headers.join(', ')}`);
    }
  }
  return found;
}

async function seedTickets(client, dataDir) {
  const report = [];

  const tickets = readOptional(dataDir, 'tickets_history.csv');
  if (!tickets) {
    report.push('Bỏ qua phiếu: không có data/tickets_history.csv');
  } else {
    const c = resolveColumns(tickets, TICKET_COL, 'tickets_history.csv', ['desc']);
    for (const r of tickets) {
      await client.query(
        `INSERT INTO ticket (ticket_code, center_id, status, issue_desc)
         VALUES ($1, $2, $3, $4) ON CONFLICT (ticket_code) DO NOTHING`,
        [r[c.code], r[c.center], toStatusCode(r[c.status]), (c.desc && r[c.desc]) || '(không có mô tả)']
      );
    }
  }

  const txns = readOptional(dataDir, 'part_transactions.csv');
  if (!txns) {
    report.push('Bỏ qua giao dịch: không có data/part_transactions.csv');
  } else if (!tickets) {
    report.push('Bỏ qua giao dịch: cần nạp phiếu trước (giao dịch XUAT tham chiếu ticket_code)');
  } else {
    const c = resolveColumns(txns, TXN_COL, 'part_transactions.csv', ['id']);
    // Không có transaction_id thì không chống trùng được: chỉ nạp khi sổ đang trống.
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM part_transaction');
    if (!c.id && rows[0].n > 0) {
      report.push('Bỏ qua giao dịch: sổ đã có dữ liệu và file không có transaction_id để chống trùng');
    } else {
      for (const r of txns) {
        const ticket = r[c.ticket] ? r[c.ticket] : null; // NHAP để trống mã phiếu
        await client.query(
          `INSERT INTO part_transaction (${c.id ? 'transaction_id, ' : ''}center_id, part_id, loai, so_luong, ngay, ticket_code)
           VALUES (${c.id ? '$7, ' : ''}$1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
          [r[c.center], r[c.part], String(r[c.loai]).toUpperCase(), r[c.qty], r[c.ngay], ticket,
            ...(c.id ? [r[c.id]] : [])]
        );
      }
      // Giao dịch mới tạo từ API phải có id sau id lớn nhất của dataset.
      await client.query(
        `SELECT setval(pg_get_serial_sequence('part_transaction', 'transaction_id'),
                       COALESCE(MAX(transaction_id), 1)) FROM part_transaction`
      );
    }
  }
  return report;
}

module.exports = { seedTickets, toStatusCode };
