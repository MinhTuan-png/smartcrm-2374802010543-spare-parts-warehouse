// Lớp 2 (API / REST controller): nhận-trả JSON và kiểm tra đầu vào.
// Không chứa quy tắc nghiệp vụ, không gọi repository (chỉ gọi service).
const express = require('express');
const service = require('../services/stock.service');
const { AppError } = require('../errors');

const router = express.Router({ mergeParams: true });

// Bọc handler async để lỗi luôn chuyển tới error-handler (chạy được cả Express 4 và 5).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseCenterId(req) {
  const id = Number(req.params.centerId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('VALIDATION_FAILED', 'centerId phải là số nguyên dương', 'centerId');
  }
  return id;
}

// FR1, FR6: tra cứu tồn kho (q, low_only, page)
router.get('/', wrap(async (req, res) => {
  const centerId = parseCenterId(req);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('VALIDATION_FAILED', 'page phải là số nguyên ≥ 1', 'page');
  }
  const q = String(req.query.q || '').trim();
  const lowOnly = req.query.low_only === 'true';
  res.json(await service.listStock({ centerId, q, lowOnly, page }));
}));

// Xem một dòng tồn theo mã linh kiện
router.get('/:partCode', wrap(async (req, res) => {
  const centerId = parseCenterId(req);
  res.json(await service.getStock(centerId, req.params.partCode));
}));

// FR8: đặt ngưỡng cảnh báo (số nguyên ≥ 0)
router.patch('/:partCode/threshold', wrap(async (req, res) => {
  const centerId = parseCenterId(req);
  const value = req.body && req.body.min_threshold;
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError('VALIDATION_FAILED', 'min_threshold phải là số nguyên ≥ 0', 'min_threshold');
  }
  res.json(await service.setThreshold(centerId, req.params.partCode, value));
}));

module.exports = router;
