import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** beforeinstallprompt 未在标准 lib 中声明，按浏览器实际字段收窄。 */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  canInstall: boolean;
  installed: boolean;
  standalone: boolean;
  supported: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstall: () => void;
  applyUpdate: () => void;
}

function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

/**
 * PWA 状态的唯一注册点：只在 AppLayout 调用一次。
 * useRegisterSW 与 injectRegister: null 配对，避免重复注册。
 */
export function usePwa(): PwaState {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error: unknown) =>
      console.error('[timepin] Service worker registration failed', error),
  });

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback((): Promise<boolean> => {
    if (!prompt) return Promise.resolve(false);
    return prompt
      .prompt()
      .then(() => prompt.userChoice)
      .then((choice) => {
        setPrompt(null);
        if (choice.outcome === 'accepted') setInstalled(true);
        return choice.outcome === 'accepted';
      })
      .catch((error: unknown) => {
        console.error('[timepin] Unable to install app', error);
        return false;
      });
  }, [prompt]);

  const dismissInstall = useCallback(() => setDismissed(true), []);

  const applyUpdate = useCallback(() => {
    void updateServiceWorker(true).catch((error: unknown) =>
      console.error('[timepin] Unable to apply update', error),
    );
  }, [updateServiceWorker]);

  return {
    canInstall: prompt !== null && !dismissed && !installed && !standalone,
    installed: installed || standalone,
    standalone,
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    needRefresh,
    offlineReady,
    promptInstall,
    dismissInstall,
    applyUpdate,
  };
}
