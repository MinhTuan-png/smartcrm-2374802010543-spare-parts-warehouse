// Lớp 2 (API): GET /health cho docker-compose (HEALTHCHECK) và người vận hành.
// Không cần đăng nhập, không trả dữ liệu nghiệp vụ. 200 khi CSDL trả lời, 503 khi không.
const express = require('express');
const db = require('../db/connection');
const { logger } = require('../logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    logger.warn('health: CSDL không trả lời', { requestId: req.requestId, err });
    res.status(503).json({ status: 'degraded', db: 'unavailable' });
  }
});

module.exports = router;
