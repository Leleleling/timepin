import { Info } from 'lucide-react';
import { interpolate, useDict } from '../../utils/i18n';

/** 关于卡：版本、产品说明与「无账号、无服务器」的离线边界。 */
export function SettingsAboutCard() {
  const t = useDict();
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0';

  return (
    <section className="tp-surface flex gap-3 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 tp-muted dark:bg-white/10">
        <Info className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{t.settingsExtra.aboutTitle}</h2>
          <span className="tp-pill bg-black/5 tp-muted dark:bg-white/10">
            {interpolate(t.settingsExtra.versionTemplate, { version })}
          </span>
        </div>
        <p className="tp-muted mt-1.5 text-sm leading-relaxed">{t.settingsExtra.aboutBody}</p>
        <p className="tp-muted mt-2 text-xs leading-relaxed">{t.settingsExtra.offlineNote}</p>
      </div>
    </section>
  );
}
