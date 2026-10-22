// Test kiểm tra dữ liệu ở ranh giới (validators/stock.schema.js), theo bảng mục 1.7 của api-contract.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { schemas, validate } = require(path.resolve(__dirname, '../src/backend/validators/stock.schema'));

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.code, 'VALIDATION_FAILED');
    return e.details.map((d) => d.field);
  }
  assert.fail('Phải ném VALIDATION_FAILED');
};

const ok = { ticket_code: 'BH-000002/2025', part_code: 'PIN-OP-03', quantity: 2 };

test('[giá trị biên] quantity nhận 1 và 9999', () => {
  assert.equal(validate(schemas.exportBody, { ...ok, quantity: 1 }).quantity, 1);
  assert.equal(validate(schemas.importBody, { part_code: 'PIN-OP-03', quantity: 9999 }).quantity, 9999);
});

test('[dữ liệu sai] quantity 0, âm, thập phân, chuỗi, null, 10000 đều bị từ chối', () => {
  for (const quantity of [0, -1, 2.5, '2', null, 10000]) {
    assert.deepEqual(fieldsOf(() => validate(schemas.exportBody, { ...ok, quantity })), ['quantity'], `quantity=${quantity}`);
  }
});

test('[dữ liệu sai] ticket_code, part_code sai định dạng và body rỗng báo đủ từng trường', () => {
  assert.deepEqual(fieldsOf(() => validate(schemas.exportBody, { ...ok, ticket_code: 'BH-2/2025' })), ['ticket_code']);
  assert.deepEqual(fieldsOf(() => validate(schemas.exportBody, { ...ok, part_code: 'pin-op-03' })), ['part_code']);
  assert.deepEqual(fieldsOf(() => validate(schemas.exportBody, undefined)).sort(), ['part_code', 'quantity', 'ticket_code']);
});

test('EP1: q cắt khoảng trắng, tối đa 50 ký tự; low_only chỉ true/false; page ≥ 1', () => {
  assert.deepEqual(validate(schemas.stockQuery, { q: '  pin ' }), { q: 'pin', low_only: false, page: 1 });
  assert.deepEqual(fieldsOf(() => validate(schemas.stockQuery, { q: 'x'.repeat(51) })), ['q']);
  assert.deepEqual(fieldsOf(() => validate(schemas.stockQuery, { low_only: 'yes' })), ['low_only']);
  for (const page of ['0', '-1', '1.5', 'abc']) {
    assert.deepEqual(fieldsOf(() => validate(schemas.lowQuery, { page })), ['page'], `page=${page}`);
  }
});

test('EP6: min_threshold nhận 0, từ chối −1 và chuỗi', () => {
  assert.equal(validate(schemas.thresholdBody, { min_threshold: 0 }).min_threshold, 0);
  assert.deepEqual(fieldsOf(() => validate(schemas.thresholdBody, { min_threshold: -1 })), ['min_threshold']);
  assert.deepEqual(fieldsOf(() => validate(schemas.thresholdBody, { min_threshold: '10' })), ['min_threshold']);
});
