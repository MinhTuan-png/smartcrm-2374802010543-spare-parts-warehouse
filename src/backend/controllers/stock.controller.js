// Lớp 2 (API / REST controller): nhận-trả JSON, xác thực, phân quyền và kiểm tra đầu vào.
// Không chứa quy tắc nghiệp vụ, không gọi repository (chỉ gọi service).
// Mỗi route theo thứ tự kiểm tra của docs/api-contract.md mục 1.1: 401 → 403 → 400 → (service).
const express = require('express');
const service = require('../services/stock.service');
const { authenticate, allowRoles, sameCenter } = require('./auth');
const { schemas, validate } = require('../validators/stock.schema');

const router = express.Router({ mergeParams: true });

// Bọc handler async để lỗi luôn chuyển tới error-handler (chạy được cả Express 4 và 5).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const technicianOnly = allowRoles(['TECHNICIAN'], 'Chỉ kỹ thuật viên mới được xuất linh kiện cho phiếu.');
const managerOnly = allowRoles(['MANAGER'], 'Chỉ quản lý trung tâm mới được thực hiện thao tác này.');

router.use(authenticate, sameCenter);

// EP1 (FR1, FR6): tra cứu tồn kho (q, low_only, page)
router.get('/', wrap(async (req, res) => {
  const { q, low_only: lowOnly, page } = validate(schemas.stockQuery, req.query);
  res.json(await service.listStock({ centerId: req.centerId, q, lowOnly, page }));
}));

// EP4 (FR6): danh sách sắp hết. Khai báo TRƯỚC '/:partCode' để "low" không bị hiểu là mã linh kiện.
router.get('/low', wrap(async (req, res) => {
  const { page } = validate(schemas.lowQuery, req.query);
  res.json(await service.listLowStock({ centerId: req.centerId, page }));
}));

// EP2 (FR2, FR3, FR6): xuất linh kiện cho phiếu — chỉ kỹ thuật viên
router.post('/exports', technicianOnly, wrap(async (req, res) => {
  const b = validate(schemas.exportBody, req.body);
  res.status(201).json(await service.exportPart({
    centerId: req.centerId, ticketCode: b.ticket_code, partCode: b.part_code, quantity: b.quantity,
  }));
}));

// EP3 (FR5, FR6): ghi nhập kho — chỉ quản lý
router.post('/imports', allowRoles(['MANAGER'], 'Chỉ quản lý trung tâm mới được ghi nhập kho.'),
  wrap(async (req, res) => {
    const b = validate(schemas.importBody, req.body);
    res.status(201).json(await service.importPart({
      centerId: req.centerId, partCode: b.part_code, quantity: b.quantity,
    }));
  }));

// Xem một dòng tồn theo mã linh kiện (Màn hình 2, 3: hiện tồn hiện tại trước khi xuất/nhập)
router.get('/:partCode', wrap(async (req, res) => {
  const { partCode } = validate(schemas.partCodeParam, req.params);
  res.json(await service.getStock(req.centerId, partCode));
}));

// EP6 (FR8): đặt ngưỡng cảnh báo — chỉ quản lý
router.patch('/:partCode/threshold', managerOnly, wrap(async (req, res) => {
  const { partCode } = validate(schemas.partCodeParam, req.params);
  const { min_threshold: value } = validate(schemas.thresholdBody, req.body);
  res.json(await service.setThreshold(req.centerId, partCode, value));
}));

module.exports = router;
