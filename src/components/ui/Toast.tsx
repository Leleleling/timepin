import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useDict } from '../../utils/i18n';
import { useToastStore, type ToastItem, type ToastTone } from '../../store/useToastStore';
import { cn } from './cn';

const toneIcon: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const toneClass: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-brand',
  info: 'tp-muted',
};

function ToastRow({ item }: { item: ToastItem }) {
  const t = useDict();
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = toneIcon[item.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id, item.duration]);

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className="tp-surface tp-pop-in pointer-events-auto flex w-full items-center gap-2.5 rounded-card border-l-4 border-brand px-3.5 py-3 shadow-lift"
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', toneClass[item.tone])} />
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.message}</span>
      {item.action ? (
        <button
          type="button"
          onClick={() => {
            item.action?.run();
            dismiss(item.id);
          }}
          className="tp-focus shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t.action.close}
        onClick={() => dismiss(item.id)}
        className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 全局 Toast 宿主，挂在 AppLayout 一次即可。 */
export function ToastHost() {
  const items = useToastStore((state) => state.items);
  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] mx-auto flex max-w-md flex-col gap-2 sm:inset-x-6"
    >
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>
  );
}
