import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// PWA Service Worker auto registration
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Campus PWA: New content available, reload to update.');
      },
      onOfflineReady() {
        console.log('Campus PWA: App ready to work offline.');
      },
    });
  }).catch(() => {
    // virtual:pwa-register might not be present in dev mode
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
