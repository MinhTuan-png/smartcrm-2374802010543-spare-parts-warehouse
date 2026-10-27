// Nạp dữ liệu từ dataset: danh mục (service_center, part, part_stock) và, nếu có file,
// phiếu (tickets_history.csv → ticket) cùng sổ giao dịch (part_transactions.csv → part_transaction).
// Giữ nguyên center_id / part_id trong CSV để part_stock (dùng id số) khớp đúng.
// Chạy lại được (ON CONFLICT DO NOTHING). Phần phiếu/giao dịch nằm ở seed-tickets.js.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { pool } = require('../connection');
const { seedTickets } = require('./seed-tickets');
const { seedUsers } = require('./seed-users');
const { logger } = require('../../logger');

// Thư mục chứa CSV: biến DATA_DIR (đường dẫn tương đối tính từ gốc repo, hoặc tuyệt đối như /data trong
// container); mặc định <gốc repo>/data. Dữ liệu mẫu nhỏ đi kèm repo nằm ở data-mau/ (DATA_DIR=data-mau).
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const DATA_DIR = path.resolve(REPO_ROOT, process.env.DATA_DIR || 'data');

const FILES = { centers: 'service_centers.csv', parts: 'parts.csv', stock: 'part_stock.csv' };
const COL = {
  center: { id: 'center_id', code: 'center_code', name: 'center_name', city: 'thanh_pho' },
  part:   { id: 'part_id', code: 'part_code', name: 'part_name', price: 'unit_price' },
  stock:  { center: 'center_id', part: 'part_id', qty: 'quantity', min: 'min_threshold' },
};

const readCsv = (file) =>
  parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'), {
    columns: true, skip_empty_lines: true, bom: true, trim: true,
  });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const r of readCsv(FILES.centers)) {
      await client.query(
        `INSERT INTO service_center (center_id, center_code, center_name, thanh_pho)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [r[COL.center.id], r[COL.center.code], r[COL.center.name], r[COL.center.city]]
      );
    }
    for (const r of readCsv(FILES.parts)) {
      await client.query(
        `INSERT INTO part (part_id, part_code, part_name, unit_price)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [r[COL.part.id], r[COL.part.code], r[COL.part.name], r[COL.part.price]]
      );
    }
    for (const r of readCsv(FILES.stock)) {
      await client.query(
        `INSERT INTO part_stock (center_id, part_id, quantity, min_threshold)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [r[COL.stock.center], r[COL.stock.part], r[COL.stock.qty], r[COL.stock.min]]
      );
    }

    // Đã chèn id thủ công nên đưa bộ đếm tự tăng lên sau id lớn nhất,
    // để lần INSERT không kèm id sau này không bị trùng khóa.
    await client.query(
      `SELECT setval(pg_get_serial_sequence('service_center', 'center_id'),
                     COALESCE(MAX(center_id), 1)) FROM service_center`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('part', 'part_id'),
                     COALESCE(MAX(part_id), 1)) FROM part`
    );

    const extra = await seedTickets(client, DATA_DIR);
    extra.push(await seedUsers(client));

    await client.query('COMMIT');
    extra.forEach((line) => logger.info(line));
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('seed lỗi, đã hoàn tác', { dataDir: DATA_DIR, err });
    process.exitCode = 1;
  } finally {
    client.release();
  }

  for (const t of ['service_center', 'part', 'part_stock', 'ticket', 'part_transaction', 'app_user']) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    logger.info('số dòng sau seed', { table: t, rows: rows[0].n }); // dataset đầy đủ: 6 / 180 / 717 / 7800 / 4954 / 12
  }
  await pool.end();
})();