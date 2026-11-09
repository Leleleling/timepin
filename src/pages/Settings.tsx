import { Check, Languages, Palette } from 'lucide-react';
import { BackupCard } from '../components/settings/BackupCard';
import { SettingsAboutCard } from '../components/settings/SettingsAboutCard';
import { SettingsDataCard } from '../components/settings/SettingsDataCard';
import { SettingsNotifyCard } from '../components/settings/SettingsNotifyCard';
import { SettingsPwaCard } from '../components/settings/SettingsPwaCard';
import { cn } from '../components/ui/cn';
import { useAppStore, type ThemeMode } from '../store/useAppStore';
import { ACCENTS } from '../utils/accents';
import type { AccentKey } from '../db/models';
import { useDict, type Lang } from '../utils/i18n';

export default function Settings() {
  const t = useDict();
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const accent = useAppStore((state) => state.accent);
  const setTheme = useAppStore((state) => state.setTheme);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setAccent = useAppStore((state) => state.setAccent);

  const themes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
    { value: 'system', label: t.settings.themeSystem },
  ];
  const languages: { value: Lang; label: string }[] = [
    { value: 'zh', label: t.settings.languageZh },
    { value: 'en', label: t.settings.languageEn },
  ];

  return (
    <div className="tp-rise space-y-4">
      <section className="tp-surface p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-[18px] w-[18px] text-brand" />
          <h2 className="text-base font-semibold">{t.settings.appearance}</h2>
        </div>
        <p className="tp-muted mt-1.5 text-sm">{t.settings.themeBody}</p>

        <div className="mt-5">
          <p className="tp-label mb-2">{t.settings.theme}</p>
          <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {themes.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={theme === item.value}
                onClick={() => setTheme(item.value)}
                className={cn(
                  'tp-segment flex-1 cursor-pointer',
                  theme === item.value ? 'tp-segment-active' : 'tp-segment-idle',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tp-divider my-5" />

        <div>
          <p className="tp-label mb-3">{t.settings.accent}</p>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
              const selected = accent === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={selected}
                  title={key}
                  onClick={() => setAccent(key)}
                  className={cn(
                    'tp-focus h-9 w-9 cursor-pointer rounded-full transition-all duration-200',
                    selected
                      ? 'ring-2 ring-brand ring-offset-2 ring-offset-[var(--tp-surface)]'
                      : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: ACCENTS[key].brand }}
                >
                  {selected ? (
                    <span className="flex h-full w-full items-center justify-center text-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="tp-muted mt-2 text-xs">{t.settings.accentBody}</p>
        </div>

        <div className="tp-divider my-5" />

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Languages className="h-4 w-4 tp-muted" />
            <p className="tp-label">{t.settings.language}</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {languages.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={language === item.value}
                onClick={() => setLanguage(item.value)}
                className={cn(
                  'tp-segment flex-1 cursor-pointer',
                  language === item.value ? 'tp-segment-active' : 'tp-segment-idle',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="tp-muted mt-2 text-xs">{t.settings.languageBody}</p>
        </div>
      </section>

      <BackupCard />
      <SettingsNotifyCard />
      <SettingsPwaCard />
      <SettingsDataCard />
      <SettingsAboutCard />
    </div>
  );
}
