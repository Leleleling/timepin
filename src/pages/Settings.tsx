import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Languages, Moon, Palette, Pipette, Sun, Tag } from 'lucide-react';
import { BackupCard } from '../components/settings/BackupCard';
import { ExportCard } from '../components/settings/ExportCard';
import { SnapshotCard } from '../components/settings/SnapshotCard';
import { DensitySettingsCard } from '../components/settings/DensitySettingsCard';
import { SettingsAboutCard } from '../components/settings/SettingsAboutCard';
import { SettingsDataCard } from '../components/settings/SettingsDataCard';
import { SettingsNotifyCard } from '../components/settings/SettingsNotifyCard';
import { SettingsPwaCard } from '../components/settings/SettingsPwaCard';
import { ThemePreviewCard } from '../components/settings/ThemePreviewCard';
import { UrgencyCurveCard } from '../components/settings/UrgencyCurveCard';
import { WeightsSettingsCard } from '../components/settings/WeightsSettingsCard';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import type { AccentKey, AppSettings } from '../db/models';
import { useAppStore, type ThemeMode } from '../store/useAppStore';
import { ACCENTS, accentHex, isHexColor } from '../utils/accents';
import { useDict, type Lang } from '../utils/i18n';

interface AccentPickerProps {
  value: AccentKey;
  custom?: string;
  onPreset: (key: AccentKey) => void;
  onCustom: (hex: string | undefined) => void;
}

/** U2：六色预设 + 取色器 + 十六进制输入，三者共用同一个最终色值。 */
function AccentPicker({ value, custom, onPreset, onCustom }: AccentPickerProps) {
  const t = useDict();
  const [draft, setDraft] = useState(custom ?? '');
  const [invalid, setInvalid] = useState(false);
  const activeHex = accentHex(value, custom);

  useEffect(() => {
    setDraft(custom ?? '');
    setInvalid(false);
  }, [custom]);

  const commit = (raw: string) => {
    const normalized = raw.trim();
    if (!normalized) {
      onCustom(undefined);
      setInvalid(false);
      return;
    }
    if (isHexColor(normalized)) {
      onCustom(normalized.toUpperCase());
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
          const selected = !custom && value === key;
          return (
            <button
              key={key}
              type="button"
              aria-label={t.settings.accentNames[key]}
              aria-pressed={selected}
              title={t.settings.accentNames[key]}
              onClick={() => onPreset(key)}
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="tp-focus relative h-9 w-9 cursor-pointer">
          <input
            type="color"
            value={activeHex}
            aria-label={t.appearanceExtra.customAccent}
            onChange={(event) => onCustom(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            className="pointer-events-none flex h-full w-full items-center justify-center rounded-full border border-black/10"
            style={{ backgroundColor: activeHex }}
          >
            <Pipette className="h-4 w-4 text-white" />
          </span>
        </label>
        <input
          type="text"
          value={draft}
          placeholder={t.appearanceExtra.customAccentPlaceholder}
          aria-label={t.appearanceExtra.customAccent}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(draft);
            }
          }}
          className="tp-focus tp-border tp-surface h-9 w-36 rounded-lg border px-3 text-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft('');
            onCustom(undefined);
          }}
        >
          {t.appearanceExtra.customAccentReset}
        </Button>
      </div>
      <p className="tp-muted mt-2 text-xs">{t.appearanceExtra.customAccentBody}</p>
      {invalid ? (
        <p role="alert" className="mt-1 text-xs font-medium text-brand">
          {t.appearanceExtra.customAccentInvalid}
        </p>
      ) : null}
    </div>
  );
}

export default function Settings() {
  const t = useDict();
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const accent = useAppStore((state) => state.accent);
  const customAccent = useAppStore((state) => state.customAccent);
  const darkAccent = useAppStore((state) => state.darkAccent);
  const darkCustomAccent = useAppStore((state) => state.darkCustomAccent);
  const colorMap = useAppStore((state) => state.colorMap);
  const setTheme = useAppStore((state) => state.setTheme);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setAccent = useAppStore((state) => state.setAccent);
  const setCustomAccent = useAppStore((state) => state.setCustomAccent);
  const setDarkAccent = useAppStore((state) => state.setDarkAccent);
  const setDarkCustomAccent = useAppStore((state) => state.setDarkCustomAccent);
  const setColorMap = useAppStore((state) => state.setColorMap);

  const themes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
    { value: 'system', label: t.settings.themeSystem },
  ];
  const languages: { value: Lang; label: string }[] = [
    { value: 'zh', label: t.settings.languageZh },
    { value: 'en', label: t.settings.languageEn },
  ];
  const importanceRows: { key: keyof AppSettings['colorMap']; label: string }[] = [
    { key: 'high', label: t.appearanceExtra.importanceHigh },
    { key: 'medium', label: t.appearanceExtra.importanceMedium },
    { key: 'low', label: t.appearanceExtra.importanceLow },
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
          <div className="mb-3 flex items-center gap-2">
            <Sun className="h-4 w-4 tp-muted" />
            <p className="tp-label">{t.settings.accent}</p>
          </div>
          <AccentPicker
            value={accent}
            custom={customAccent}
            onPreset={setAccent}
            onCustom={setCustomAccent}
          />
        </div>

        <div className="tp-divider my-5" />

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 tp-muted" />
              <p className="tp-label">{t.appearanceExtra.darkAccent}</p>
            </div>
            <Button
              variant={darkAccent === undefined ? 'soft' : 'ghost'}
              size="sm"
              aria-pressed={darkAccent === undefined}
              onClick={() => setDarkAccent(undefined)}
            >
              {t.appearanceExtra.darkAccentFollow}
            </Button>
          </div>
          <AccentPicker
            value={darkAccent ?? accent}
            custom={darkCustomAccent}
            onPreset={setDarkAccent}
            onCustom={setDarkCustomAccent}
          />
          <p className="tp-muted mt-2 text-xs">{t.appearanceExtra.darkAccentBody}</p>
        </div>

        <div className="tp-divider my-5" />

        <div>
          <p className="tp-label mb-2">{t.appearanceExtra.importanceColors}</p>
          <div className="flex flex-wrap gap-4">
            {importanceRows.map((row) => (
              <label key={row.key} className="tp-focus flex cursor-pointer items-center gap-2">
                <input
                  type="color"
                  value={colorMap[row.key]}
                  aria-label={row.label}
                  onChange={(event) =>
                    setColorMap({ ...colorMap, [row.key]: event.target.value.toUpperCase() })
                  }
                  className="h-8 w-8 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0"
                />
                <span className="tp-muted text-xs">{row.label}</span>
              </label>
            ))}
          </div>
          <p className="tp-muted mt-2 text-xs">{t.appearanceExtra.importanceColorsBody}</p>
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

      <section className="tp-surface flex flex-wrap items-center gap-3 p-5">
        <Tag className="h-[18px] w-[18px] text-brand" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{t.featuresExtra.tagsTitle}</h3>
          <p className="tp-muted mt-1 text-xs">{t.featuresExtra.tagsOpen}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/tags')}>
          {t.featuresExtra.tagsOpen}
        </Button>
      </section>

      <ThemePreviewCard />
      <DensitySettingsCard />
      <UrgencyCurveCard />
      <WeightsSettingsCard />
      <BackupCard />
      <ExportCard />
      <SnapshotCard />
      <SettingsNotifyCard />
      <SettingsPwaCard />
      <SettingsDataCard />
      <SettingsAboutCard />
    </div>
  );
}
