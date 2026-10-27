# Ảnh chạy giao diện: dựng React bằng Vite rồi phục vụ tệp tĩnh bằng nginx.

# ---------- GIAI ĐOẠN 1: dựng giao diện ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Để trống: giao diện gọi /api cùng nguồn, nginx chuyển tiếp sang backend (không cần CORS).
# Muốn gọi thẳng một backend khác thì truyền --build-arg VITE_API_BASE_URL=http://...
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---------- GIAI ĐOẠN 2: nginx không chạy bằng root (cổng 8080) ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
