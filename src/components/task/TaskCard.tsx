import { CalendarClock, Check, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useSwipe } from '../../hooks/useSwipe';
import { useDict, type Lang } from '../../utils/i18n';
import { quadrantOf } from '../../utils/sorting';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface TaskCardProps {
  task: Task;
  colorMap: AppSettings['colorMap'];
  threshold: number;
  language: Lang;
  now: number;
  onComplete: (task: Task) => void;
  onTogglePin: (task: Task) => void;
  onPostpone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
}

const badgeClass = {
  1: 'bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-red-300',
  2: 'bg-sun-soft text-[#9A6200] dark:bg-sun/20 dark:text-sun',
  3: 'bg-sun-soft text-[#9A6200] dark:bg-sun/20 dark:text-sun',
  4: 'bg-black/5 tp-muted dark:bg-white/10',
} as const;

export function TaskCard({
  task,
  colorMap,
  threshold,
  language,
  now,
  onComplete,
  onTogglePin,
  onPostpone,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const t = useDict();
  const quadrant = quadrantOf(task, threshold);
  const badgeKey = `q${quadrant}` as keyof typeof t.task.badge;
  const barColor =
    task.importance === 3
      ? colorMap.high
      : task.importance === 2
        ? colorMap.medium
        : colorMap.low;
  const importanceLabel =
    task.importance === 3
      ? t.task.importance.high
      : task.importance === 2
        ? t.task.importance.medium
        : t.task.importance.low;

  const done = task.status === 'done';
  const hasDue = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt);
  const overdue = hasDue && (task.dueAt as number) < now && !done;
  const dueText = hasDue
    ? new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(task.dueAt as number))
    : '';
  const doneSubtasks = task.subtasks.filter((item) => item.done).length;

  const { offset, handlers } = useSwipe({
    enabled: !done,
    onSwipeRight: () => onPostpone(task),
    onSwipeLeft: () => onDelete(task),
  });

  return (
    <div
      className="relative overflow-hidden rounded-card"
      style={{ touchAction: 'pan-y' }}
      {...handlers}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex">
        <div className="flex w-1/2 items-center justify-start bg-sun px-4">
          <span className={cn('tp-swipe-hint bg-black/15', offset <= 0 && 'opacity-0')}>
            {t.action.postpone}
          </span>
        </div>
        <div className="flex w-1/2 items-center justify-end bg-brand px-4">
          <span className={cn('tp-swipe-hint bg-brand-deep', offset >= 0 && 'opacity-0')}>
            {t.action.remove}
          </span>
        </div>
      </div>

      <article
        className="tp-surface relative flex flex-col gap-3 p-4 pl-5 transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-card"
          style={{ backgroundColor: barColor }}
        />

        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={done ? t.task.done : t.action.complete}
            aria-pressed={done}
            onClick={() => onComplete(task)}
            className={cn('tp-check mt-0.5', done && 'border-brand bg-brand text-white')}
          >
            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              title={t.task.editHint}
              onClick={() => onEdit(task)}
              className={cn(
                'block w-full truncate text-left text-base font-semibold transition-all duration-200 hover:text-brand',
                done && 'text-muted line-through opacity-60',
              )}
            >
              {task.title}
            </button>
            <div className="tp-muted mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className={cn(overdue && 'font-semibold text-brand')}>
                {hasDue
                  ? `${overdue ? t.task.overdue : t.task.due} · ${dueText}`
                  : t.task.noDue}
              </span>
              <span
                className="tp-pill bg-black/[0.04] py-0.5 dark:bg-white/10"
                style={{ color: barColor }}
              >
                {importanceLabel}
              </span>
              {task.subtasks.length > 0 ? (
                <span>
                  {t.task.subtasks} {doneSubtasks}/{task.subtasks.length}
                </span>
              ) : null}
              {task.pinned ? (
                <span className="tp-pill bg-brand/10 py-0.5 text-brand">{t.task.pinned}</span>
              ) : null}
              {task.tags.map((tag) => (
                <span key={tag} className="tp-pill tp-border border py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <span className={cn('tp-pill shrink-0', badgeClass[quadrant])}>
            {t.task.badge[badgeKey]}
          </span>
        </div>

        <div className="tp-border flex items-center gap-1 border-t pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={task.pinned ? t.action.unpin : t.action.pin}
            title={task.pinned ? t.action.unpin : t.action.pin}
            onClick={() => onTogglePin(task)}
          >
            {task.pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!hasDue || done}
            aria-label={t.action.postpone}
            title={t.action.postpone}
            onClick={() => onPostpone(task)}
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-brand"
            aria-label={t.action.edit}
            title={t.action.edit}
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-brand"
            aria-label={t.action.remove}
            title={t.action.remove}
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <span className="tp-muted ml-auto hidden text-[11px] sm:block">
            {t.task.swipeHint}
          </span>
        </div>
      </article>
    </div>
  );
}
