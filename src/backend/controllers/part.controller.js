// Lớp 2 (API): danh mục linh kiện /api/v1/parts (TD-21). Đọc: mọi người đã đăng nhập;
// thêm, sửa, ngừng dùng: chỉ quản lý. Thứ tự kiểm tra 401 → 403 → 400 → (service), như stock.controller.js.
const express = require('express');
const service = require('../services/part.service');
const { authenticate, allowRoles } = require('./auth');
const { schemas, validate } = require('../validators/stock.schema');

const router = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const managerOnly = allowRoles(['MANAGER'], 'Chỉ quản lý trung tâm mới được sửa danh mục linh kiện.');

router.use(authenticate);

// Đọc danh sách (q, page)
router.get('/', wrap(async (req, res) => {
  const { q, page } = validate(schemas.partsQuery, req.query);
  res.json(await service.listParts({ q, page }));
}));

// Đọc một linh kiện
router.get('/:partCode', wrap(async (req, res) => {
  const { partCode } = validate(schemas.partCodeParam, req.params);
  res.json(await service.getPart(partCode));
}));

// Tạo
router.post('/', managerOnly, wrap(async (req, res) => {
  const b = validate(schemas.partCreateBody, req.body);
  res.status(201).json(await service.createPart({
    partCode: b.part_code, partName: b.part_name, unitPrice: b.unit_price,
  }));
}));

// Sửa tên, đơn giá (không sửa mã)
router.patch('/:partCode', managerOnly, wrap(async (req, res) => {
  const { partCode } = validate(schemas.partCodeParam, req.params);
  const b = validate(schemas.partUpdateBody, req.body);
  res.json(await service.updatePart(partCode, { partName: b.part_name, unitPrice: b.unit_price }));
}));

// Xoá = ngừng dùng (QT-13), 204 không có nội dung
router.delete('/:partCode', managerOnly, wrap(async (req, res) => {
  const { partCode } = validate(schemas.partCodeParam, req.params);
  await service.deletePart(partCode);
  res.sendStatus(204);
}));

module.exports = router;