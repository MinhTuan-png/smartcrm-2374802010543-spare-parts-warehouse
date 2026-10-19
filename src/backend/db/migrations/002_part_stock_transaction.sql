-- DDL theo BT1 (Mục 4.2). Phần 2: tồn kho và sổ giao dịch kho.
CREATE TABLE IF NOT EXISTS part_stock (
    center_id     BIGINT NOT NULL REFERENCES service_center(center_id),
    part_id       BIGINT NOT NULL REFERENCES part(part_id),
    quantity      INT NOT NULL CHECK (quantity >= 0),  -- QT-09
    min_threshold INT NOT NULL CHECK (min_threshold >= 0),
    PRIMARY KEY (center_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_low ON part_stock (center_id) WHERE quantity < min_threshold;

CREATE TABLE IF NOT EXISTS part_transaction (
    transaction_id BIGSERIAL PRIMARY KEY,
    center_id      BIGINT NOT NULL,
    part_id        BIGINT NOT NULL,
    loai           VARCHAR(5) NOT NULL CHECK (loai IN ('NHAP','XUAT')),
    so_luong       INT NOT NULL CHECK (so_luong > 0),
    ngay           DATE NOT NULL DEFAULT CURRENT_DATE,
    ticket_code    VARCHAR(20) REFERENCES ticket(ticket_code),
    FOREIGN KEY (center_id, part_id) REFERENCES part_stock(center_id, part_id),
    CHECK ( (loai = 'XUAT' AND ticket_code IS NOT NULL)
         OR (loai = 'NHAP' AND ticket_code IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_txn_center_part_day ON part_transaction (center_id, part_id, ngay DESC, transaction_id DESC);
CREATE INDEX IF NOT EXISTS idx_txn_center_day ON part_transaction (center_id, ngay DESC, transaction_id DESC);
CREATE INDEX IF NOT EXISTS idx_txn_ticket ON part_transaction (ticket_code) WHERE loai = 'XUAT';
