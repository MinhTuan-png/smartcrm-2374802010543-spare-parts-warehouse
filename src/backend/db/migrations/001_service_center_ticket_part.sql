-- DDL theo BT1 (Mục 4.2). Phần 1: trung tâm, phiếu (L2), nhật ký trạng thái, linh kiện.
CREATE TABLE IF NOT EXISTS service_center (
    center_id    BIGSERIAL PRIMARY KEY,
    center_code  VARCHAR(10) NOT NULL UNIQUE,
    center_name  VARCHAR(80) NOT NULL,
    thanh_pho    VARCHAR(40) NOT NULL
);

-- Bảng của L2, chỉ khai báo các cột L5 cần đọc
CREATE TABLE IF NOT EXISTS ticket (
    ticket_id    BIGSERIAL PRIMARY KEY,
    ticket_code  VARCHAR(20) NOT NULL UNIQUE,
    center_id    BIGINT NOT NULL REFERENCES service_center(center_id),
    status       VARCHAR(20) NOT NULL CHECK (status IN ('MOI','DA_PHAN_CONG','DANG_XU_LY',
                 'CHO_LINH_KIEN','HOAN_TAT','DA_DONG','DA_HUY')),
    issue_desc   TEXT NOT NULL
);

-- Bảng của L2; L5 chỉ ghi qua hàm chuyển trạng thái
CREATE TABLE IF NOT EXISTS ticket_status_log (
    log_id       BIGSERIAL PRIMARY KEY,
    ticket_id    BIGINT NOT NULL REFERENCES ticket(ticket_id),
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    changed_at   TIMESTAMP NOT NULL,
    changed_by   BIGINT NOT NULL,
    note         VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS part (
    part_id      BIGSERIAL PRIMARY KEY,
    part_code    VARCHAR(30) NOT NULL UNIQUE,
    part_name    VARCHAR(120) NOT NULL,
    unit_price   NUMERIC(12,0) NOT NULL CHECK (unit_price >= 0)
);
