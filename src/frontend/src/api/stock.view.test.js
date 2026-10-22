// Test hợp đồng ở ranh giới API → giao diện. Chạy: npm test (trong src/frontend).
import test from 'node:test';
import assert from 'node:assert/strict';
import { toStockRowView, toLowStockPageView, toMovementView, toUsedPartsView, formatVnd } from './stock.view.js';

test('toStockRowView trả đúng các trường và giữ null của warning_label', () => {
  const v = toStockRowView({
    part_code: 'PIN-OP-03', part_name: 'Pin OPPO loại 3', quantity: 10, min_threshold: 3,
    unit_price: 650000, low_stock_warning: false, warning_label: null,
  });
  assert.deepEqual(Object.keys(v).sort(),
    ['minThreshold', 'partCode', 'partName', 'quantity', 'shortage', 'unitPriceText', 'warning']);
  assert.equal(v.warning, null);
  assert.equal(v.shortage, 0);
  assert.equal(v.unitPriceText, formatVnd(650000));
  assert.match(v.unitPriceText, /^650\.000\s₫$/);
});

test('dòng sắp hết không có đơn giá thì unitPriceText là null, không phải "NaN ₫"', () => {
  const page = toLowStockPageView({
    page: 1, page_size: 20, total_items: 1, total_pages: 1, out_of_stock_count: 1,
    items: [{ part_code: 'CAM-AP-01', part_name: 'Camera', quantity: 0, min_threshold: 8, shortage: 8, warning_label: 'HẾT HÀNG' }],
  });
  assert.equal(page.rows[0].unitPriceText, null);
  assert.equal(page.rows[0].shortage, 8);
  assert.equal(page.outOfStock, 1);
});

test('toMovementView: NHAP có ticketCode = null, cảnh báo lấy từ phản hồi', () => {
  const v = toMovementView({
    transaction: { transaction_id: 4956, type: 'NHAP', quantity: 20, transaction_date: '2026-10-02', ticket_code: null, part_code: 'LOA-AP-01' },
    stock: { part_code: 'LOA-AP-01', part_name: 'Loa', quantity: 21, min_threshold: 8 },
    low_stock_warning: false, warning_label: null,
  });
  assert.equal(v.ticketCode, null);
  assert.equal(v.stock.quantity, 21);
  assert.equal(v.stock.warning, null);
});

test('toUsedPartsView: phiếu chưa xuất gì vẫn có tổng cộng "0 ₫", không phải undefined', () => {
  const v = toUsedPartsView({ ticket_code: 'BH-000002/2025', items: [], total_amount: 0 });
  assert.deepEqual(v.rows, []);
  assert.equal(v.totalText, formatVnd(0));
});
