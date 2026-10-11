import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, Download, X, Smartphone } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShowBanner(false);
      return;
    }

    // Check if dismissed before in this session
    const dismissed = sessionStorage.getItem('campus_pwa_dismissed');
    if (dismissed) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setShowBanner(true);
    }

    // Handle Android/Desktop Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('campus_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="mx-4 my-2 p-3.5 rounded-2xl bg-gradient-to-r from-calico-orange/15 to-calico-peach/30 border border-calico-orange/30 shadow-ios-sm flex items-start justify-between relative overflow-hidden animate-fade-in">
      <div className="flex items-start space-x-3">
        <div className="w-9 h-9 rounded-xl bg-calico-orange text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1">
            <span>加到主畫面體驗最佳！</span>
            <span className="text-[10px] bg-calico-orange text-white px-1.5 py-0.2 rounded-full font-bold">PWA</span>
          </h4>
          <p className="text-[11px] text-calico-cocoa/75 dark:text-zinc-300 mt-0.5 leading-snug">
            {isIOS ? (
              <span className="inline-flex items-center flex-wrap gap-1">
                點擊 Safari 下方的 <Share className="w-3.5 h-3.5 inline text-calico-orange" /> 分享按鈕，再點選「<PlusSquare className="w-3.5 h-3.5 inline text-calico-orange" /> 加入主畫面」即可全螢幕秒開！
              </span>
            ) : (
              '安裝為手機 App，享受無網址列全螢幕與離線快取！'
            )}
          </p>
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-calico-orange text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>立即安裝 App</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={dismiss}
        className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa/80 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
