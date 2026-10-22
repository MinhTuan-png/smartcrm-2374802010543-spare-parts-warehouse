// Lớp 2 (API): đọc phiếu sửa chữa theo mã. Không có center_id trên đường dẫn: lớp nghiệp vụ
// so trung tâm của phiếu với token (api-contract.md mục 1.1). Mã phiếu có dấu "/" nên giao diện
// gửi dạng mã hoá: /api/v1/tickets/BH-000002%2F2025.
const express = require('express');
const service = require('../services/ticket.service');
const { authenticate } = require('./auth');
const { schemas, validate } = require('../validators/stock.schema');

const router = express.Router();
// wrap: hàm async ném lỗi thì chuyển lỗi sang next() để error-handler trả đúng định dạng lỗi chung.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate); // mọi đường dẫn bên dưới đều cần token hợp lệ (401 nếu thiếu/sai)

// EP-L2: tra cứu phiếu (bản đọc của L5 thay cho endpoint của L2)
router.get('/:ticketCode', wrap(async (req, res) => {
  const { ticketCode } = validate(schemas.ticketCodeParam, req.params);
  res.json(await service.getTicket(ticketCode, req.user.centerId));
}));

// EP8 (FR9, UC10): linh kiện đã dùng của phiếu
router.get('/:ticketCode/used-parts', wrap(async (req, res) => {
  const { ticketCode } = validate(schemas.ticketCodeParam, req.params);
  res.json(await service.listUsedParts(ticketCode, req.user.centerId));
}));

module.exports = router;
