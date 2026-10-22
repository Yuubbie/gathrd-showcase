import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone/installed mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If native event wasn't cached, trigger native browser install prompt
      window.dispatchEvent(new Event('beforeinstallprompt'));
    }
  };

  // If already running inside installed PWA, do not show button
  if (isInstalled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={handleInstallClick}
        style={{
          backgroundColor: '#15111F',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
          border: '1.5px solid #E5C07B',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(229, 192, 123, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Smartphone size={14} color="#E5C07B" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, lineHeight: 1.1 }}>Install Gathrd</p>
          <p style={{ margin: 0, fontSize: '9px', opacity: 0.7 }}>Add to Home Screen</p>
        </div>
        <div
          style={{
            backgroundColor: '#E5C07B',
            color: '#15111F',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '4px',
          }}
        >
          <Download size={12} /> Install
        </div>
      </button>
    </div>
  );
}