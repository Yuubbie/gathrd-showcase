import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'gathrd_install_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    return !Number.isNaN(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_MS;
  } catch (err) {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt({ offsetForSidebar = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return undefined;

    const onPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIOS()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (err) {
      // Private mode may block storage; the chip simply returns next visit.
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed z-30 print:hidden ${offsetForSidebar ? 'md:left-64' : ''}`}
      style={{
        left: 'max(0.75rem, env(safe-area-inset-left))',
        bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className={`pointer-events-auto ${offsetForSidebar ? 'md:ml-3' : ''}`}>
        <div className="flex items-center gap-2 rounded-full border border-[#E5C07B]/50 bg-[#15111F] py-1.5 pl-3 pr-1.5 text-white shadow-lg">
          {iosHint && !deferredPrompt ? (
            <p className="max-w-[11rem] text-[11px] leading-tight text-white/80">
              Share, then Add to Home Screen
            </p>
          ) : (
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download size={13} color="#E5C07B" />
              Install app
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
