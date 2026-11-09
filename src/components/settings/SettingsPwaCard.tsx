import { Download, HardDriveDownload, RefreshCw } from 'lucide-react';
import { useLayoutContext } from '../../hooks/layoutContext';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';

/** PWA 与离线状态卡：安装入口、离线就绪、版本更新与版本号。 */
export function SettingsPwaCard() {
  const t = useDict();
  const pwa = useLayoutContext().pwa;
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0';

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <HardDriveDownload className="h-[18px] w-[18px] text-brand" />
        <h2 className="text-base font-semibold">{t.settingsExtra.pwaTitle}</h2>
      </div>
      <p className="tp-muted mt-1.5 text-sm leading-relaxed">{t.settingsExtra.pwaBody}</p>

      <div className="tp-divider my-5" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="tp-pill bg-[#E7F7EC] text-[#16794A] dark:bg-[#16A34A]/15 dark:text-[#7BD8A0]">
          {pwa.offlineReady || pwa.supported
            ? t.settingsExtra.pwaOfflineReady
            : t.settingsExtra.pwaNotReady}
        </span>
        <span className="tp-pill bg-black/5 tp-muted dark:bg-white/10">
          {interpolate(t.settingsExtra.versionTemplate, { version })}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pwa.installed ? (
          <span className="tp-muted text-xs">{t.settingsExtra.pwaInstalled}</span>
        ) : pwa.canInstall ? (
          <Button size="sm" onClick={() => void pwa.promptInstall()}>
            <Download className="h-4 w-4" />
            {t.settingsExtra.pwaInstallAction}
          </Button>
        ) : (
          <span className="tp-muted text-xs">{t.settingsExtra.pwaNotReady}</span>
        )}

        {pwa.needRefresh ? (
          <Button variant="outline" size="sm" onClick={pwa.applyUpdate}>
            <RefreshCw className="h-4 w-4" />
            {t.settingsExtra.pwaUpdateAction}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
