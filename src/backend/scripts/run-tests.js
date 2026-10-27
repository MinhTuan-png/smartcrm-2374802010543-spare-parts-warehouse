// Chạy mọi tests/*.test.js bằng node:test. Tự liệt kê file vì Node 20 không mở rộng glob
// và PowerShell cũng không mở rộng "*" như bash.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = path.resolve(__dirname, '../../../tests');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().map((f) => path.join(dir, f));
// Log JSON của server làm rối kết quả test: mặc định tắt (LOG_LEVEL=silent), muốn xem thì đặt LOG_LEVEL=debug.
const env = { ...process.env, LOG_LEVEL: process.env.LOG_LEVEL || 'silent' };
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit', env });
process.exit(r.status ?? 1);
