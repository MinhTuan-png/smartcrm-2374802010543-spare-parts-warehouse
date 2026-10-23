// Điểm vào của giao diện: gắn component App vào thẻ <div id="root"> trong index.html.
// StrictMode chỉ chạy ở môi trường dev, giúp phát hiện sớm lỗi dùng sai hook của React.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
