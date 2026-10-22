import { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowGuide((prev) => !prev);
    }
  };

  return (
    <aside aria-label="Install App" className="fixed bottom-5 left-5 md:left-72 z-50 max-w-xs shadow-2xl">
      <div className="bg-ink text-white p-3 rounded-2xl border-2 border-gold/40 flex items-center justify-between gap-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
            <Smartphone className="text-gold" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Install Gathrd</p>
            <p className="text-[10px] text-white/70">Add to home screen</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="bg-gold hover:bg-gold-light text-ink text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Download size={13} /> Install
        </button>
      </div>

      {showGuide && (
        <div className="mt-2 bg-white text-ink text-xs p-3.5 rounded-xl border border-ink/15 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-ink text-xs">How to install:</p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-ink/40 hover:text-ink text-xs"
            >
              ✕
            </button>
          </div>
          <ul className="text-[11px] text-ink/70 space-y-1 list-disc list-inside">
            <li><strong>Desktop (Chrome/Edge):</strong> Look for the <strong>Install icon</strong> in your URL address bar.</li>
            <li><strong>iPhone (Safari):</strong> Tap <strong>Share</strong> (box with arrow) → <strong>Add to Home Screen</strong>.</li>
            <li><strong>Android (Chrome):</strong> Tap <strong>Menu (⋮)</strong> → <strong>Install app</strong>.</li>
          </ul>
        </div>
      )}
    </aside>
  );
}