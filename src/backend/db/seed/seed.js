// Nạp dữ liệu DANH MỤC từ dataset: service_center, part, part_stock.
// Giữ nguyên center_id / part_id trong CSV để part_stock (dùng id số) khớp đúng.
// Chạy lại được (ON CONFLICT DO NOTHING). Chưa nạp ticket / giao dịch (không thuộc buổi 8).
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { pool } = require('../connection');

const DATA_DIR = path.resolve(__dirname, '../../../../data'); // <gốc repo>/data

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

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed lỗi, đã hoàn tác:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }

  for (const t of ['service_center', 'part', 'part_stock']) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    console.log(`${t}: ${rows[0].n} dòng`); // kỳ vọng 6 / 180 / 717
  }
  await pool.end();
})();