// Chạy mọi tests/*.test.js bằng node:test. Tự liệt kê file vì Node 20 không mở rộng glob
// và PowerShell cũng không mở rộng "*" như bash.
//
// Chạy lại ĐÚNG MỘT test case theo mã trong tên test (TC-01 ... TC-12, xem docs/test-report.md):
//   npm test -- TC-01
// Chỉ các tệp có chứa chuỗi đó được chạy, và chỉ test có tên khớp. (Không dùng thẳng --test-name-pattern
// cho mọi tệp: tệp không có test khớp thì hook dọn dẹp không chạy, kết nối CSDL bị treo và tiến trình không thoát.)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = path.resolve(__dirname, '../../../tests');
let files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().map((f) => path.join(dir, f));

const pattern = process.argv.slice(2).find((a) => !a.startsWith('-'));
const args = ['--test', '--test-concurrency=1'];
if (pattern) {
  files = files.filter((f) => fs.readFileSync(f, 'utf8').includes(pattern));
  if (files.length === 0) {
    console.error(`Không có test nào chứa "${pattern}" trong ${dir}`);
    process.exit(1);
  }
  args.push(`--test-name-pattern=${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

// Log JSON của server làm rối kết quả test: mặc định tắt (LOG_LEVEL=silent), muốn xem thì đặt LOG_LEVEL=debug.
const env = { ...process.env, LOG_LEVEL: process.env.LOG_LEVEL || 'silent' };
const r = spawnSync(process.execPath, [...args, ...files], { stdio: 'inherit', env });
process.exit(r.status ?? 1);
