import { ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useNow } from '../../hooks/useNow';
import { colorForImportance } from '../../utils/calendar';
import { buildDaySlots } from '../../utils/calendarViews';
import { useDict, interpolate, type Lang } from '../../utils/i18n';
import { formatLunarDate } from '../../utils/lunar';
import { quadrantOf } from '../../utils/sorting';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface DayViewProps {
  date: Date;
  tasks: Task[];
  colorMap: AppSettings['colorMap'];
  threshold: number;
  language: Lang;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onEdit: (task: Task) => void;
  onCreate: () => void;
  onOpenSheet: () => void;
}

/** 日视图：按小时的纵向时间轴，任务落在截止时刻；无截止时间的归入「未设时刻」。 */
export function DayView({
  date,
  tasks,
  colorMap,
  threshold,
  language,
  onPrev,
  onNext,
  onToday,
  onEdit,
  onCreate,
  onOpenSheet,
}: DayViewProps) {
  const t = useDict();
  const now = useNow();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const slots = buildDaySlots();
  // U23：只有查看「今天」时才定位当前小时，跨天后由共享时钟自动刷新。
  const isCurrentDay = new Date(now).toDateString() === date.toDateString();
  const currentHour = isCurrentDay ? new Date(now).getHours() : -1;
  const byHour = new Map<number, Task[]>();
  const undated: Task[] = [];

  tasks.forEach((task) => {
    if (typeof task.dueAt !== 'number' || !Number.isFinite(task.dueAt)) {
      undated.push(task);
      return;
    }
    const hour = new Date(task.dueAt).getHours();
    const bucket = byHour.get(hour);
    if (bucket) bucket.push(task);
    else byHour.set(hour, [task]);
  });

  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
  const lunar = formatLunarDate(date, language);
  const timeLabel = (value: number) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

  const renderTask = (task: Task) => {
    const badgeKey = `q${quadrantOf(task, threshold)}` as keyof typeof t.task.badge;
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => onEdit(task)}
        className="tp-focus tp-border mb-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all duration-200 hover:border-brand/40 hover:bg-brand/5"
      >
        <span
          className="h-7 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: colorForImportance(task.importance, colorMap) }}
        />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-xs font-semibold', task.status === 'done' && 'line-through opacity-55')}>
            {task.title}
          </span>
          <span className="tp-muted block text-[11px]">
            {typeof task.dueAt === 'number' ? timeLabel(task.dueAt) : t.calendarViews.allDay}
          </span>
        </span>
        <span className="tp-pill shrink-0 bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
          {t.task.badge[badgeKey]}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <section className="tp-surface tp-pop-in p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.prev} onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[9rem] text-center">
              <h2 className="text-base font-semibold">{dateLabel}</h2>
              {lunar ? <p className="tp-muted text-xs">{lunar}</p> : null}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.next} onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
            {interpolate(t.calendarViews.dayCountTemplate, { count: tasks.length })}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            {t.calendarViews.thisDay}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenSheet}>
            {t.calendarViews.openSheet}
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {t.action.add}
          </Button>
        </div>
      </section>

      <section className="tp-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand" />
          <p className="tp-label">{t.calendarViews.timeline}</p>
        </div>

        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold">{t.calendarViews.emptyDay}</p>
            <p className="tp-muted mx-auto mt-2 max-w-xs text-xs leading-relaxed">
              {t.calendarViews.hintDay}
            </p>
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto pr-1">
            {slots.map((slot) => (
              <div
                key={slot.hour}
                className={cn(
                  'flex min-h-[26px] gap-3 rounded-md transition-colors',
                  currentHour === slot.hour && 'bg-brand-soft/70 dark:bg-brand/10',
                )}
              >
                <span
                  className={cn(
                    'w-10 shrink-0 pt-1 text-[11px] tabular-nums',
                    currentHour === slot.hour ? 'font-semibold text-brand' : 'tp-muted',
                  )}
                  title={currentHour === slot.hour ? t.featuresExtra.currentHour : undefined}
                >
                  {slot.label}
                </span>
                <div className="tp-border min-w-0 flex-1 border-t pt-1">
                  {(byHour.get(slot.hour) ?? []).map(renderTask)}
                </div>
              </div>
            ))}
            {undated.length > 0 ? (
              <div className="mt-3 rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.05]">
                <p className="tp-label mb-2">{t.calendarViews.allDay}</p>
                {undated.map(renderTask)}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
