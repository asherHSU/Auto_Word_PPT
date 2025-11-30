import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 獲取 root 元素
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 如果您不需要性能報告，可以註釋掉下面這行
// reportWebVitals();