-- DDL theo báo cáo BT1 (mục 4.2), giữ để đối chiếu với báo cáo.
-- Bản CSDL đang chạy là các migration trong src/backend/db/migrations/ (001–004):
-- thêm app_user (TD-14) và cột is_active cho part, part_stock (TD-21).
CREATE TABLE service_center (
    center_id    BIGSERIAL PRIMARY KEY,
    center_code  VARCHAR(10) NOT NULL UNIQUE,
    center_name  VARCHAR(80) NOT NULL,
    thanh_pho    VARCHAR(40) NOT NULL
);
 
CREATE TABLE ticket (
    ticket_id    BIGSERIAL PRIMARY KEY,
    ticket_code  VARCHAR(20) NOT NULL UNIQUE,
    center_id    BIGINT NOT NULL REFERENCES service_center(center_id),
    status       VARCHAR(20) NOT NULL CHECK (status IN ('MOI','DA_PHAN_CONG','DANG_XU_LY',
                 'CHO_LINH_KIEN','HOAN_TAT','DA_DONG','DA_HUY')),
    issue_desc   TEXT NOT NULL 
);
 
CREATE TABLE ticket_status_log (
    log_id       BIGSERIAL PRIMARY KEY,
    ticket_id    BIGINT NOT NULL REFERENCES ticket(ticket_id),
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    changed_at   TIMESTAMP NOT NULL,
    changed_by   BIGINT NOT NULL,
    note         VARCHAR(255)
);
 
CREATE TABLE part (
    part_id      BIGSERIAL PRIMARY KEY,
    part_code    VARCHAR(30) NOT NULL UNIQUE,
    part_name    VARCHAR(120) NOT NULL,
    unit_price   NUMERIC(12,0) NOT NULL CHECK (unit_price >= 0)
);
 
CREATE TABLE part_stock (
    center_id     BIGINT NOT NULL REFERENCES service_center(center_id),
    part_id       BIGINT NOT NULL REFERENCES part(part_id),
    quantity      INT NOT NULL CHECK (quantity >= 0),  -- QT-09
    min_threshold INT NOT NULL CHECK (min_threshold >= 0),
    PRIMARY KEY (center_id, part_id)
);
CREATE INDEX idx_stock_low ON part_stock (center_id) WHERE quantity < min_threshold;
 
CREATE TABLE part_transaction (
    transaction_id BIGSERIAL PRIMARY KEY,
    center_id      BIGINT NOT NULL,
    part_id        BIGINT NOT NULL,
    loai           VARCHAR(5) NOT NULL CHECK (loai IN ('NHAP','XUAT')),
    so_luong       INT NOT NULL CHECK (so_luong > 0),  -- luôn dương
    ngay           DATE NOT NULL DEFAULT CURRENT_DATE,
    ticket_code    VARCHAR(20) REFERENCES ticket(ticket_code),
    FOREIGN KEY (center_id, part_id) REFERENCES part_stock(center_id, part_id),
    CHECK ( (loai = 'XUAT' AND ticket_code IS NOT NULL)
         OR (loai = 'NHAP' AND ticket_code IS NULL))
);
CREATE INDEX idx_txn_center_part_day ON part_transaction (center_id, part_id, ngay DESC, transaction_id DESC);
CREATE INDEX idx_txn_center_day ON part_transaction (center_id, ngay DESC, transaction_id DESC);
CREATE INDEX idx_txn_ticket ON part_transaction (ticket_code) WHERE loai = 'XUAT';