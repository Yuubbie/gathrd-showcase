import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: register the service worker so Chrome/Edge/Android will
// offer an "Install app" prompt. Runs after the page loads so it
// doesn't compete with the app's own startup.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

// ---------------------------------------------------------------
// Custom "Install Gathrd" banner.
//
// Chrome will not let any site force its native install dialog to
// pop up automatically on load — that's an anti-spam protection
// built into the browser. What we CAN do is listen for the browser's
// own "this is installable" signal (beforeinstallprompt) and
// immediately show our own clear, branded banner offering to install,
// so people don't have to dig through a menu to find it.
//
// iOS Safari never fires beforeinstallprompt (Apple doesn't support
// the API), so for iOS we instead show a short instructional banner
// pointing at the Share -> Add to Home Screen steps.
// ---------------------------------------------------------------
(function setupInstallBanner() {
  const DISMISS_KEY = 'gathrd_install_dismissed_at';
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // don't re-nag for 7 days after a dismissal

  function recentlyDismissed() {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    return !Number.isNaN(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_MS;
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true // iOS Safari's own flag
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function buildBanner({ showInstallButton, onInstall }) {
    const banner = document.createElement('div');
    banner.setAttribute('id', 'gathrd-install-banner');
    banner.style.cssText = [
      'position:fixed', 'left:16px', 'right:16px', 'bottom:16px',
      'max-width:480px', 'margin:0 auto',
      'background:#1E1B29', 'color:#FBF7EF',
      'border:1px solid #A9791E', 'border-radius:14px',
      'padding:14px 16px', 'display:flex', 'align-items:center', 'gap:12px',
      'box-shadow:0 12px 32px rgba(0,0,0,0.35)', 'z-index:99999',
      'font-family:Verdana, Arial, sans-serif',
    ].join(';');

    const icon = document.createElement('img');
    icon.src = '/icon-192.png';
    icon.style.cssText = 'width:38px;height:38px;border-radius:8px;flex-shrink:0;';

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex:1;min-width:0;';

    const title = document.createElement('div');
    title.textContent = 'Install Gathrd';
    title.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:2px;';

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:12px;color:#C9BFA8;line-height:1.35;';
    subtitle.textContent = showInstallButton
      ? 'Add it to your home screen for quick access.'
      : 'Tap Share, then "Add to Home Screen".';

    textWrap.appendChild(title);
    textWrap.appendChild(subtitle);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

    if (showInstallButton) {
      const installBtn = document.createElement('button');
      installBtn.textContent = 'Install';
      installBtn.style.cssText = [
        'background:linear-gradient(135deg,#A9791E,#C9A227)', 'color:white',
        'border:none', 'border-radius:8px', 'padding:8px 16px',
        'font-weight:bold', 'font-size:13px', 'cursor:pointer',
        'font-family:Verdana, Arial, sans-serif',
      ].join(';');
      installBtn.onclick = onInstall;
      actions.appendChild(installBtn);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '\u2715';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.style.cssText = [
      'background:transparent', 'color:#C9BFA8', 'border:none',
      'font-size:16px', 'cursor:pointer', 'padding:4px 6px', 'line-height:1',
    ].join(';');
    dismissBtn.onclick = () => {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      banner.remove();
    };
    actions.appendChild(dismissBtn);

    banner.appendChild(icon);
    banner.appendChild(textWrap);
    banner.appendChild(actions);
    return banner;
  }

  function showBanner(opts) {
    if (isStandalone() || recentlyDismissed()) return;
    if (document.getElementById('gathrd-install-banner')) return; // already showing
    const banner = buildBanner(opts);
    document.body.appendChild(banner);
  }

  // --- Android / Desktop Chrome & Edge path ---
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    showBanner({
      showInstallButton: true,
      onInstall: async () => {
        event.prompt();
        await event.userChoice; // we don't need to branch on the outcome
        const el = document.getElementById('gathrd-install-banner');
        if (el) el.remove();
      },
    });
  });

  // --- iOS Safari path (no beforeinstallprompt support at all) ---
  window.addEventListener('load', () => {
    if (isIOS() && !isStandalone()) {
      showBanner({ showInstallButton: false, onInstall: null });
    }
  });
})();
