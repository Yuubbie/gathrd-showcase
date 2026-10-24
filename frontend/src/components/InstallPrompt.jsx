import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPrompt({ offsetForSidebar = false }) {
  const [installed, setInstalled] = useState(isStandalone);
  const [canPrompt, setCanPrompt] = useState(() => Boolean(window.gathrdInstallEvent));

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return undefined;
    }

    const onReady = () => setCanPrompt(Boolean(window.gathrdInstallEvent));
    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
    };

    window.addEventListener('gathrd-install-ready', onReady);
    window.addEventListener('gathrd-installed', onInstalled);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('gathrd-install-ready', onReady);
      window.removeEventListener('gathrd-installed', onInstalled);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    const event = window.gathrdInstallEvent;
    if (event) {
      event.prompt();
      await event.userChoice;
      window.gathrdInstallEvent = null;
      setCanPrompt(false);
      return;
    }

    const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    window.alert(
      isiOS
        ? 'On iPhone: tap Share, then Add to Home Screen.'
        : 'Tap Install when Chrome or Edge asks. If it does not, use the install icon in the address bar.'
    );
  }

  if (installed) return null;

  return (
    <div
      className={`fixed z-30 print:hidden ${offsetForSidebar ? 'md:left-[17rem]' : ''}`}
      style={{
        left: 'max(0.75rem, env(safe-area-inset-left))',
        bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-1.5 rounded-full border border-[#E5C07B] bg-[#15111F] px-3 py-2 text-xs font-semibold text-white shadow-lg"
      >
        <Download size={13} color="#E5C07B" />
        {canPrompt ? 'Install app' : 'Install Gathrd'}
      </button>
    </div>
  );
}
