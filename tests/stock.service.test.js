// Unit test cho LỚP NGHIỆP VỤ (services/stock.service.js): quy tắc xuất/nhập kho QT-09, QT-14,
// QT-L5-02. KHÔNG cần CSDL: repository và lớp tích hợp L2 được thay bằng bản giả trong bộ nhớ.
// Đây là lợi ích của việc tách lớp repository: kiểm được quy tắc mà không phải dựng PostgreSQL.
// Mỗi tên test ghi rõ loại: [luồng đúng] · [giá trị biên] · [dữ liệu sai].
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const backend = path.resolve(__dirname, '../src/backend');
const repoPath = require.resolve(path.join(backend, 'repositories/stock.repository'));
const ticketPath = require.resolve(path.join(backend, 'integrations/ticket.integration'));

// Dữ liệu giả: một dòng tồn và một phiếu. Mỗi test dựng lại từ đầu bằng setup().
let stock;
let ticket;
let written; // các giao dịch đã ghi vào sổ, để kiểm "lỗi thì không ghi gì"

// Repository giả: cùng tên hàm với repository thật, nhưng chỉ đọc/ghi biến trong bộ nhớ.
const fakeRepo = {
  inTransaction: (fn) => fn({}), // không có CSDL nên chỉ gọi thẳng hàm, client là đối tượng rỗng
  lockStock: async (client, centerId, partCode) =>
    (stock && stock.center_id === centerId && stock.part_code === partCode ? { ...stock } : null),
  changeQuantity: async (client, centerId, partId, delta) => {
    stock.quantity += delta;
    return { quantity: stock.quantity, min_threshold: stock.min_threshold };
  },
  insertTransaction: async (client, t) => {
    const row = { transaction_id: String(written.length + 1), loai: t.loai, so_luong: t.soLuong,
      ngay: '2026-10-23', ticket_code: t.ticketCode };
    written.push(row);
    return row;
  },
};

// Lớp tích hợp L2 giả: trả phiếu đã dựng sẵn.
const fakeTickets = {
  findTicket: async (code) => (ticket && ticket.code === code ? ticket : null),
  allowedExportLabels: () => ['Đang xử lý', 'Chờ linh kiện'],
};

// Thay module thật bằng bản giả TRƯỚC khi nạp service, để service dùng bản giả.
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: fakeRepo };
require.cache[ticketPath] = { id: ticketPath, filename: ticketPath, loaded: true, exports: fakeTickets };
const service = require(path.join(backend, 'services/stock.service'));

function setup({ quantity = 10, minThreshold = 3, status = 'Đang xử lý', exportable = true, ticketCenter = 2 } = {}) {
  stock = { center_id: 2, part_id: 7, part_code: 'PIN-SS-01', part_name: 'Pin Samsung loại 1',
    quantity, min_threshold: minThreshold, unit_price: '1450000' };
  ticket = { code: 'BH-000002/2025', centerId: ticketCenter, statusLabel: status, exportable };
  written = [];
}

const exportInput = (quantity) => ({ centerId: 2, ticketCode: 'BH-000002/2025', partCode: 'PIN-SS-01', quantity });

// Kiểm lỗi nghiệp vụ: đúng mã lỗi, và tồn + sổ giao dịch KHÔNG thay đổi.
async function expectRejected(promise, code, quantityBefore) {
  await assert.rejects(promise, (e) => e.code === code);
  assert.equal(stock.quantity, quantityBefore, 'tồn không được đổi khi bị từ chối');
  assert.equal(written.length, 0, 'không được ghi giao dịch khi bị từ chối');
}

test('[luồng đúng] tồn 10 xuất 2 → còn 8, ghi đúng 1 giao dịch XUAT gắn mã phiếu', async () => {
  setup({ quantity: 10 });
  const r = await service.exportPart(exportInput(2));
  assert.equal(r.stock.quantity, 8);
  assert.equal(written.length, 1);
  assert.equal(written[0].loai, 'XUAT');
  assert.equal(r.transaction.ticket_code, 'BH-000002/2025');
  assert.equal(r.low_stock_warning, false);
});

test('[luồng đúng] tồn 3 nhập 10 → 13, giao dịch NHAP không có mã phiếu', async () => {
  setup({ quantity: 3 });
  const r = await service.importPart({ centerId: 2, partCode: 'PIN-SS-01', quantity: 10 });
  assert.equal(r.stock.quantity, 13);
  assert.equal(r.transaction.type, 'NHAP');
  assert.equal(r.transaction.ticket_code, null);
});

test('[giá trị biên] xuất đúng bằng tồn (5/5) được phép, tồn về 0 và báo HẾT HÀNG', async () => {
  setup({ quantity: 5, minThreshold: 3 });
  const r = await service.exportPart(exportInput(5));
  assert.equal(r.stock.quantity, 0);
  assert.equal(r.warning_label, 'HẾT HÀNG');
});

test('[giá trị biên] xuất nhiều hơn tồn 1 đơn vị (tồn 5, xuất 6) → 409 INSUFFICIENT_STOCK (QT-09)', async () => {
  setup({ quantity: 5 });
  await expectRejected(service.exportPart(exportInput(6)), 'INSUFFICIENT_STOCK', 5);
});

test('[giá trị biên] xuất xong tồn đúng bằng ngưỡng thì KHÔNG cảnh báo; thấp hơn 1 thì SẮP HẾT', async () => {
  setup({ quantity: 10, minThreshold: 8 });
  const r1 = await service.exportPart(exportInput(2)); // còn 8 = ngưỡng
  assert.equal(r1.low_stock_warning, false);
  const r2 = await service.exportPart(exportInput(1)); // còn 7 < ngưỡng
  assert.equal(r2.warning_label, 'SẮP HẾT');
});

test('[dữ liệu sai] phiếu "Đã hoàn tất" → 422 TICKET_STATE_INVALID, kèm các trạng thái được phép (QT-L5-02)', async () => {
  setup({ status: 'Đã hoàn tất', exportable: false });
  await assert.rejects(service.exportPart(exportInput(1)), (e) =>
    e.code === 'TICKET_STATE_INVALID' && e.details.allowed_statuses.includes('Đang xử lý'));
  assert.equal(stock.quantity, 10);
  assert.equal(written.length, 0);
});

test('[dữ liệu sai] phiếu của trung tâm khác → 403 FORBIDDEN, không lộ dữ liệu (QT-14)', async () => {
  setup({ ticketCenter: 5 });
  await expectRejected(service.exportPart(exportInput(1)), 'FORBIDDEN', 10);
});

test('[dữ liệu sai] mã phiếu không tồn tại → 404 NOT_FOUND', async () => {
  setup();
  await expectRejected(
    service.exportPart({ ...exportInput(1), ticketCode: 'BH-999999/2025' }), 'NOT_FOUND', 10);
});
