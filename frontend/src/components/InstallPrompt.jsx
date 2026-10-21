import { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback display on mobile browsers that support PWA without beforeinstallprompt (e.g. iOS Safari)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm w-[calc(100%-5rem)] sm:w-auto animate-fade-in">
      <div className="bg-signal-gradient border border-white/15 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <Smartphone className="text-gold" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Install Gathrd App</p>
            <p className="text-[11px] text-white/70">Add to your home screen</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-gold hover:bg-gold-light text-ink text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
          >
            <Download size={13} /> Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Mobile Instructions Fallback Modal/Tooltip */}
      {showGuide && (
        <div className="mt-2 bg-white text-ink text-xs p-3 rounded-xl border border-ink/10 shadow-lg space-y-1">
          <p className="font-bold">To install on your phone:</p>
          <p className="text-ink/70">Tap browser menu (<strong className="font-semibold">⋮</strong> or <strong className="font-semibold">Share</strong>) → choose <strong className="font-semibold">Add to Home screen</strong>.</p>
          <button
            onClick={() => setShowGuide(false)}
            className="text-[11px] text-signal font-semibold underline mt-1 block"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}