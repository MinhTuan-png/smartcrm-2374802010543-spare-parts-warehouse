// Test HỢP ĐỒNG ở ranh giới service → API (services/stock.contract.js).
// Kiểm tra HÌNH DẠNG và Ý NGHĨA đặc biệt (null, kiểu số, định dạng ngày), không kiểm tra nghiệp vụ.
// Ai đổi tên trường mà quên sửa docs/api-contract.md thì test này vỡ ngay trên máy.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const contract = require(path.resolve(__dirname, '../src/backend/services/stock.contract'));

// Dòng CSDL mẫu đúng như pg trả về: unit_price NUMERIC là chuỗi, transaction_id BIGSERIAL là chuỗi.
const row = { part_id: 7, part_code: 'PIN-OP-02', part_name: 'Pin OPPO loại 2', quantity: 7, min_threshold: 8, unit_price: '280000' };

test('[luồng đúng] toStockItem trả đúng các trường của EP1/EP6, không lộ part_id', () => {
  const v = contract.toStockItem(row);
  assert.deepEqual(Object.keys(v).sort(), [
    'low_stock_warning', 'min_threshold', 'part_code', 'part_name', 'quantity', 'unit_price', 'warning_label',
  ]);
  assert.equal(v.unit_price, 280000); // số nguyên VND, không phải chuỗi
  assert.equal(v.low_stock_warning, true);
  assert.equal(v.warning_label, 'SẮP HẾT');
});

test('[giá trị biên] tồn = ngưỡng thì KHÔNG cảnh báo, warning_label là null (US4 tiêu chí 3)', () => {
  const v = contract.toStockItem({ ...row, quantity: 5, min_threshold: 5 });
  assert.equal(v.low_stock_warning, false);
  assert.equal(v.warning_label, null);
});

test('[giá trị biên] tồn = 0 dưới ngưỡng là HẾT HÀNG; ngưỡng 0 và tồn 0 không cảnh báo', () => {
  assert.equal(contract.warningLabel(0, 8), 'HẾT HÀNG');
  assert.equal(contract.warningLabel(0, 0), null);
  assert.equal(contract.warningLabel(4, 5), 'SẮP HẾT');
});

test('toLowStockItem có shortage = ngưỡng − tồn và luôn có nhãn', () => {
  const v = contract.toLowStockItem({ ...row, quantity: 1, min_threshold: 8 });
  assert.deepEqual(Object.keys(v).sort(), [
    'min_threshold', 'part_code', 'part_name', 'quantity', 'shortage', 'warning_label',
  ]);
  assert.equal(v.shortage, 7);
  assert.equal(v.warning_label, 'SẮP HẾT');
});

test('toMovementResult đổi tên loai/so_luong/ngay và để ticket_code = null với NHAP', () => {
  const txn = { transaction_id: '4956', loai: 'NHAP', so_luong: 20, ngay: '2026-10-02', ticket_code: null };
  const v = contract.toMovementResult(txn, { ...row, quantity: 21, min_threshold: 8 });
  assert.deepEqual(Object.keys(v).sort(), ['low_stock_warning', 'stock', 'transaction', 'warning_label']);
  assert.deepEqual(v.transaction, {
    transaction_id: 4956, type: 'NHAP', quantity: 20, transaction_date: '2026-10-02',
    ticket_code: null, part_code: 'PIN-OP-02',
  });
  assert.match(v.transaction.transaction_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(v.stock).sort(), ['min_threshold', 'part_code', 'part_name', 'quantity']);
  assert.equal(v.low_stock_warning, false);
});

test('toPage: không có dòng nào thì total_pages = 0; 29 dòng thì 2 trang', () => {
  assert.deepEqual(contract.toPage({ page: 1, pageSize: 20, totalItems: 0 }),
    { page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  assert.equal(contract.toPage({ page: 1, pageSize: 20, totalItems: 29 }).total_pages, 2);
});
