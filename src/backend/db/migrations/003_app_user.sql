-- BT2 (TD-14): tài khoản đăng nhập ở mức cơ bản. Không có trong ERD BT1 vì khi đó việc cấp
-- token được coi là của hệ thống đăng nhập chung; BT2 yêu cầu bài nộp không còn stub đăng nhập.
CREATE TABLE IF NOT EXISTS app_user (
    user_id       BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,           -- scrypt, không bao giờ lưu mật khẩu gốc
    full_name     VARCHAR(80) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('TECHNICIAN','MANAGER')),
    center_id     BIGINT NOT NULL REFERENCES service_center(center_id)  -- QT-14
);
