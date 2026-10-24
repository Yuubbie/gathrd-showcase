import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.gathrdInstallEvent = event;
  window.dispatchEvent(new Event('gathrd-install-ready'));
});

window.addEventListener('appinstalled', () => {
  window.gathrdInstallEvent = null;
  window.dispatchEvent(new Event('gathrd-installed'));
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
