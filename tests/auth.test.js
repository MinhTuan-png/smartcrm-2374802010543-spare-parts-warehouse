// Test xác thực/phân quyền ở lớp API (controllers/auth.js), không cần CSDL.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const jwt = require(path.resolve(__dirname, '../src/backend/node_modules/jsonwebtoken'));

process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret';
const { authenticate, allowRoles, sameCenter, signToken } = require(path.resolve(__dirname, '../src/backend/controllers/auth'));

// Gọi middleware và trả về lỗi nó chuyển cho next (undefined nếu cho qua).
function run(mw, req) {
  let passed;
  mw(req, {}, (err) => { passed = err; });
  return passed;
}

test('thiếu header, sai chữ ký, hết hạn → 401 UNAUTHORIZED', () => {
  const expired = jwt.sign({ user_id: 1, role: 'MANAGER', center_id: 2, exp: 1 }, process.env.SECRET_KEY);
  const wrongKey = jwt.sign({ user_id: 1, role: 'MANAGER', center_id: 2 }, 'khoa-khac');
  for (const authorization of [undefined, 'Bearer', 'Basic abc', `Bearer ${expired}`, `Bearer ${wrongKey}`]) {
    assert.equal(run(authenticate, { headers: { authorization } })?.code, 'UNAUTHORIZED', String(authorization));
  }
});

test('token thiếu center_id hoặc vai trò lạ → 401', () => {
  const t = jwt.sign({ user_id: 1, role: 'ADMIN', center_id: 2 }, process.env.SECRET_KEY);
  assert.equal(run(authenticate, { headers: { authorization: `Bearer ${t}` } })?.code, 'UNAUTHORIZED');
});

test('token hợp lệ gắn req.user', () => {
  const req = { headers: { authorization: `Bearer ${signToken({ userId: 5, role: 'TECHNICIAN', centerId: 2 })}` } };
  assert.equal(run(authenticate, req), undefined);
  assert.deepEqual(req.user, { userId: 5, role: 'TECHNICIAN', centerId: 2 });
});

test('QT-14: center_id khác token → 403; không phải số nguyên → 400', () => {
  const user = { userId: 5, role: 'TECHNICIAN', centerId: 2 };
  assert.equal(run(sameCenter, { user, params: { centerId: '3' } })?.code, 'FORBIDDEN');
  assert.equal(run(sameCenter, { user, params: { centerId: '999' } })?.code, 'FORBIDDEN');
  assert.equal(run(sameCenter, { user, params: { centerId: 'abc' } })?.code, 'VALIDATION_FAILED');
  const req = { user, params: { centerId: '2' } };
  assert.equal(run(sameCenter, req), undefined);
  assert.equal(req.centerId, 2);
});

test('NFR5: sai vai trò → 403', () => {
  const mw = allowRoles(['MANAGER'], 'Chỉ quản lý');
  assert.equal(run(mw, { user: { role: 'TECHNICIAN' } })?.code, 'FORBIDDEN');
  assert.equal(run(mw, { user: { role: 'MANAGER' } }), undefined);
});
