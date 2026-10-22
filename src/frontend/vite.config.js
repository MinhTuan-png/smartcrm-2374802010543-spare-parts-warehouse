// Cấu hình Vite (công cụ chạy và đóng gói giao diện React).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cổng 5173 phải khớp CORS_ORIGIN trong .env của backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }, // strictPort: cổng bận thì báo lỗi, không tự đổi sang 5174
});
