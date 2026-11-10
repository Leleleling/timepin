import { Type, Rows3 } from 'lucide-react';
import { cn } from '../ui/cn';
import { useAppStore } from '../../store/useAppStore';
import type { Density, FontScale } from '../../db/models';
import { useDict } from '../../utils/i18n';

/** U5：界面密度与字号档位，改动通过 CSS 变量即时作用于全站。 */
export function DensitySettingsCard() {
  const t = useDict();
  const density = useAppStore((state) => state.density);
  const fontScale = useAppStore((state) => state.fontScale);
  const setDensity = useAppStore((state) => state.setDensity);
  const setFontScale = useAppStore((state) => state.setFontScale);

  const densities: { value: Density; label: string }[] = [
    { value: 'compact', label: t.appearanceExtra.densityCompact },
    { value: 'normal', label: t.appearanceExtra.densityNormal },
    { value: 'roomy', label: t.appearanceExtra.densityRoomy },
  ];
  const scales: { value: FontScale; label: string }[] = [
    { value: 'small', label: t.appearanceExtra.fontScaleSmall },
    { value: 'normal', label: t.appearanceExtra.fontScaleNormal },
    { value: 'large', label: t.appearanceExtra.fontScaleLarge },
  ];

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <Rows3 className="h-[18px] w-[18px] text-brand" />
        <h3 className="text-sm font-semibold">{t.appearanceExtra.density}</h3>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.appearanceExtra.densityBody}
      </p>

      <div className="mt-4 flex gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
        {densities.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={density === item.value}
            onClick={() => setDensity(item.value)}
            className={cn(
              'tp-segment flex-1 cursor-pointer',
              density === item.value ? 'tp-segment-active' : 'tp-segment-idle',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Type className="h-4 w-4 tp-muted" />
        <p className="tp-label">{t.appearanceExtra.fontScale}</p>
      </div>
      <div className="mt-2 flex gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
        {scales.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={fontScale === item.value}
            onClick={() => setFontScale(item.value)}
            className={cn(
              'tp-segment flex-1 cursor-pointer',
              fontScale === item.value ? 'tp-segment-active' : 'tp-segment-idle',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
