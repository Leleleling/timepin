import { Check, Eye } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDict } from '../../utils/i18n';

/** U3：切换主题色/重要度配色时，给出一处可立即核对效果的预览。 */
export function ThemePreviewCard() {
  const t = useDict();
  const colorMap = useAppStore((state) => state.colorMap);

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-[18px] w-[18px] text-brand" />
        <h3 className="text-sm font-semibold">{t.appearanceExtra.previewTitle}</h3>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.appearanceExtra.previewBody}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white shadow-soft">
          {t.appearanceExtra.previewButton}
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
          {t.appearanceExtra.previewTag}
        </span>
      </div>

      <div className="mt-4">
        <p className="tp-label mb-2">{t.appearanceExtra.previewBar}</p>
        <div className="space-y-1.5">
          {[colorMap.high, colorMap.medium, colorMap.low].map((color) => (
            <div
              key={color}
              className="tp-colorbar w-2/3"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
