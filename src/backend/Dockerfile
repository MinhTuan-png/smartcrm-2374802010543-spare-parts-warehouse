# Ảnh chạy backend (Express + pg). Dựng bằng docker compose ở gốc repo, không chạy tay.

# ---------- GIAI ĐOẠN 1: cài thư viện đúng phiên bản trong package-lock.json ----------
# Ghim phiên bản ảnh nền (không dùng "latest") để lần dựng nào cũng ra cùng một môi trường.
FROM node:22-alpine AS deps
WORKDIR /app
# Chép RIÊNG tệp khoá trước: mã đổi mà thư viện không đổi thì Docker dùng lại lớp cài đặt này.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- GIAI ĐOẠN 2: ảnh chạy ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Chạy bằng người dùng không đặc quyền "node" có sẵn trong ảnh nền, không chạy bằng root.
USER node
EXPOSE 3000

# docker compose chỉ coi api là "healthy" khi /health trả 200 (API chạy và CSDL trả lời).
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Chờ CSDL → tạo bảng → nạp dữ liệu (chạy lại được) → chạy server. Bước nào lỗi thì dừng, đọc docker compose logs api.
CMD ["sh", "-c", "node db/wait-for-db.js && node db/migrate.js && node db/seed/seed.js && exec node index.js"]
