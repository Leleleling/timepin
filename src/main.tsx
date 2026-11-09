import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ensureDefaults } from './db';
import { useAppStore } from './store/useAppStore';
import './index.css';

// 启动时初始化 settings 并把持久化的语言／主题灌入 Zustand；
// 存储不可用时只记录错误，界面依然可以渲染。
void ensureDefaults()
  .then((settings) => useAppStore.getState().hydrateFromSettings(settings))
  .catch((error: unknown) => console.error('[timepin] Local storage unavailable', error));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
