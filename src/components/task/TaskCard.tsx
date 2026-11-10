import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { highlightSegments } from '../../utils/search';
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
  /** 以下为可选增强：批量多选与置顶任务手动排序，不影响其它页面的调用。 */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (task: Task) => void;
  onMoveUp?: (task: Task) => void;
  onMoveDown?: (task: Task) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** U14 / U15 / U19：子任务勾选、详情页入口与搜索命中高亮。 */
  onToggleSubtask?: (task: Task, subtaskId: string) => void;
  onOpenDetail?: (task: Task) => void;
  highlightQuery?: string;
}

const badgeClass = {
  1: 'bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-brand-deep',
  2: 'bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning',
  3: 'bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning',
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
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onToggleSubtask,
  onOpenDetail,
  highlightQuery = '',
}: TaskCardProps) {
  const t = useDict();
  const [subtasksOpen, setSubtasksOpen] = useState(false);
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
          {selectionMode ? (
            <button
              type="button"
              aria-label={t.bulkExtra.selectMode}
              aria-pressed={selected}
              onClick={() => onToggleSelect?.(task)}
              className={cn(
                'tp-check mt-0.5',
                selected && 'border-brand bg-brand text-white',
              )}
            >
              {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </button>
          ) : (
            <button
              type="button"
              aria-label={done ? t.task.done : t.action.complete}
              aria-pressed={done}
              onClick={() => onComplete(task)}
              className={cn('tp-check mt-0.5', done && 'border-brand bg-brand text-white')}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <button
              type="button"
              title={t.task.editHint}
              onClick={() => onEdit(task)}
              className={cn(
                'block w-full truncate text-left text-base font-semibold transition-all duration-200 hover:text-brand',
                done && 'tp-muted line-through opacity-60',
              )}
            >
              {highlightQuery
                ? highlightSegments(task.title, highlightQuery).map((segment, position) =>
                    segment.hit ? (
                      <mark key={position} className="rounded bg-brand/25 text-inherit">
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={position}>{segment.text}</span>
                    ),
                  )
                : task.title}
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

        {task.subtasks.length > 0 ? (
          <div className="pl-9">
            <button
              type="button"
              aria-expanded={subtasksOpen}
              aria-label={t.featuresExtra.subtasksToggle}
              onClick={() => setSubtasksOpen((open) => !open)}
              className="tp-focus flex w-full cursor-pointer items-center gap-2 text-xs"
            >
              <span className="tp-muted shrink-0">{t.featuresExtra.subtaskProgress}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <span
                  className="block h-full rounded-full bg-brand transition-all duration-200"
                  style={{
                    width: `${Math.round((doneSubtasks / task.subtasks.length) * 100)}%`,
                  }}
                />
              </span>
              <span className="tp-muted shrink-0 tabular-nums">
                {doneSubtasks}/{task.subtasks.length}
              </span>
              {subtasksOpen ? (
                <ChevronUp className="h-3.5 w-3.5 tp-muted" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 tp-muted" />
              )}
            </button>
            {subtasksOpen ? (
              <ul className="mt-2 space-y-1">
                {task.subtasks.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!onToggleSubtask}
                      onClick={() => onToggleSubtask?.(task, item.id)}
                      className="tp-focus flex cursor-pointer items-center gap-2 text-left text-xs disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          item.done
                            ? 'border-brand bg-brand text-white'
                            : 'tp-border',
                        )}
                      >
                        {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                      <span className={cn(item.done && 'tp-muted line-through')}>
                        {item.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

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
          {onOpenDetail ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t.featuresExtra.detailTitle}
              title={t.featuresExtra.detailTitle}
              onClick={() => onOpenDetail(task)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          ) : null}
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
          {onMoveUp ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canMoveUp}
              aria-label={t.bulkExtra.moveUp}
              title={t.bulkExtra.moveUp}
              onClick={() => onMoveUp(task)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canMoveDown}
              aria-label={t.bulkExtra.moveDown}
              title={t.bulkExtra.moveDown}
              onClick={() => onMoveDown(task)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          ) : null}
          <span className="tp-muted ml-auto hidden text-[11px] sm:block">
            {t.task.swipeHint}
          </span>
        </div>
      </article>
    </div>
  );
}
