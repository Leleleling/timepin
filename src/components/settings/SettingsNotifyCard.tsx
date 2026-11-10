import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useLayoutContext } from '../../hooks/layoutContext';
import { useDict } from '../../utils/i18n';
import { LEAD_MINUTES } from '../../utils/notify';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

const LEAD_KEYS = ['now', 'quarter', 'hour', 'day'] as const;

/** 通知设置卡：开关、提前量、权限状态、测试提醒与「页面关闭后不推送」的边界说明。 */
export function SettingsNotifyCard() {
  const t = useDict();
  const notify = useLayoutContext().notify;
  const [feedback, setFeedback] = useState<string | null>(null);

  const permissionText = !notify.supported
    ? t.notify.permission.unsupported
    : !notify.secure
      ? t.notify.permission.insecure
      : notify.permission === 'granted'
        ? t.notify.permission.granted
        : notify.permission === 'denied'
          ? t.notify.permission.denied
          : t.notify.permission.prompt;

  const toggle = () => {
    setFeedback(null);
    if (notify.preferences.enabled) {
      void notify.setEnabled(false);
      return;
    }
    void notify.setEnabled(true).then((granted) =>
      setFeedback(granted ? t.notify.enabledOk : t.notify.enableFail),
    );
  };

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <BellRing className="h-[18px] w-[18px] text-brand" />
        <h2 className="text-base font-semibold">{t.notify.cardTitle}</h2>
      </div>
      <p className="tp-muted mt-1.5 text-sm leading-relaxed">{t.notify.cardBody}</p>

      <div className="tp-divider my-5" />

      <Button
        variant={notify.preferences.enabled ? 'primary' : 'outline'}
        size="sm"
        aria-pressed={notify.preferences.enabled}
        onClick={toggle}
      >
        {notify.preferences.enabled ? t.notify.toggleOn : t.notify.toggleOff}
      </Button>

      <p className="tp-label mb-2 mt-5">{t.notify.leadLabel}</p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
        {LEAD_MINUTES.map((minutes, index) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={notify.preferences.leadMinutes === minutes}
            onClick={() => notify.setLeadMinutes(minutes)}
            className={cn(
              'tp-segment flex-1 cursor-pointer',
              notify.preferences.leadMinutes === minutes
                ? 'tp-segment-active'
                : 'tp-segment-idle',
            )}
          >
            {t.notify.leads[LEAD_KEYS[index]]}
          </button>
        ))}
      </div>

      <div className="tp-divider my-5" />

      <p className="tp-label mb-2">{t.hardeningExtra.quietHours}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <span className="tp-muted">{t.hardeningExtra.quietStart}</span>
          <input
            type="number"
            min={0}
            max={23}
            value={notify.preferences.quietHours?.start ?? 0}
            aria-label={t.hardeningExtra.quietStart}
            onChange={(event) =>
              notify.setQuietHours({
                start: Math.min(23, Math.max(0, Number(event.target.value) || 0)),
                end: notify.preferences.quietHours?.end ?? 0,
              })
            }
            className="tp-focus tp-border tp-surface h-9 w-16 rounded-lg border px-2 text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="tp-muted">{t.hardeningExtra.quietEnd}</span>
          <input
            type="number"
            min={0}
            max={23}
            value={notify.preferences.quietHours?.end ?? 0}
            aria-label={t.hardeningExtra.quietEnd}
            onChange={(event) =>
              notify.setQuietHours({
                start: notify.preferences.quietHours?.start ?? 0,
                end: Math.min(23, Math.max(0, Number(event.target.value) || 0)),
              })
            }
            className="tp-focus tp-border tp-surface h-9 w-16 rounded-lg border px-2 text-xs"
          />
        </label>
      </div>
      <p className="tp-muted mt-2 text-xs leading-relaxed">{t.hardeningExtra.quietHint}</p>

      <p className="tp-muted mt-3 text-xs leading-relaxed">{permissionText}</p>

      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => {
          if (notify.sendTest()) setFeedback(t.notify.testOk);
          else setFeedback(t.notify.enableFail);
        }}
      >
        {t.notify.testAction}
      </Button>

      {feedback ? (
        <p role="status" className="mt-2 text-xs font-medium text-brand">
          {feedback}
        </p>
      ) : null}

      <p className="tp-muted mt-4 border-t pt-4 text-xs leading-relaxed dark:border-white/10">
        {t.notify.boundary}
      </p>
    </section>
  );
}
