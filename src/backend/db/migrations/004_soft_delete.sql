-- BT2, tiêu chí S1 (TD-21): CRUD danh mục linh kiện và dòng tồn. "Xoá" là NGỪNG DÙNG (xoá mềm), không xoá
-- vật lý (QT-13): dòng vẫn còn để sổ giao dịch và linh kiện đã dùng của phiếu tra lại được.
-- ADD COLUMN IF NOT EXISTS để chạy lại an toàn; dòng có sẵn mặc định đang dùng.
ALTER TABLE part       ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE part_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;