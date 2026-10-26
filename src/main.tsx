import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';

// Safely suppress benign Vite dev server WebSocket disconnect rejections in proxy/iframe environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = String(event.reason?.message || event.reason || '');
    if (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('failed to connect to websocket') ||
      errorMsg.includes('WebSocket closed without opened')
    ) {
      event.preventDefault();
      console.debug('[Vite HMR] Ignored dev WebSocket event:', errorMsg);
    }
  });
}

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

