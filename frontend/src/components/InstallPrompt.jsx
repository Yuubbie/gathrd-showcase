import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

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
      setShowGuide((prev) => !prev);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-xs w-[calc(100%-5.5rem)] sm:w-auto animate-fade-in">
      <div className="bg-ink text-white p-3 rounded-2xl shadow-xl border border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <Smartphone className="text-gold" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Install App</p>
            <p className="text-[10px] text-white/60">Gathrd Mobile</p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="bg-gold hover:bg-gold-light text-ink text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
        >
          <Download size={13} /> Install
        </button>
      </div>

      {showGuide && (
        <div className="mt-2 bg-white text-ink text-xs p-3 rounded-xl border border-ink/10 shadow-lg space-y-1.5 animate-fade-in">
          <p className="font-bold text-ink">To add to your phone or desktop:</p>
          <ul className="text-[11px] text-ink/70 space-y-1 list-disc list-inside">
            <li><strong>Chrome / Edge:</strong> Click the <strong className="font-semibold">Install</strong> icon in the address bar or tap browser menu (⋮) → <strong className="font-semibold">Install App</strong>.</li>
            <li><strong>iPhone (Safari):</strong> Tap the <strong className="font-semibold">Share</strong> icon (box with up arrow) → <strong className="font-semibold">Add to Home Screen</strong>.</li>
          </ul>
          <button
            onClick={() => setShowGuide(false)}
            className="text-[11px] text-signal font-semibold underline mt-1 block"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}