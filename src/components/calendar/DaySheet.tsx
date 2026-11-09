import type { AppSettings, Task } from '../../db/models';
import { colorForImportance } from '../../utils/calendar';
import { interpolate, useDict, type Lang } from '../../utils/i18n';
import { quadrantOf } from '../../utils/sorting';
import { cn } from '../ui/cn';
import { Modal } from '../ui/Modal';

export interface DaySheetProps {
  date: Date | null;
  tasks: Task[];
  colorMap: AppSettings['colorMap'];
  threshold: number;
  language: Lang;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

/** 贴底面板：列出当天全部任务，点击任意一条进入编辑。 */
export function DaySheet({
  date,
  tasks,
  colorMap,
  threshold,
  language,
  onClose,
  onEdit,
}: DaySheetProps) {
  const t = useDict();
  const dateLabel = date
    ? new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(date)
    : '';

  return (
    <Modal
      variant="sheet"
      open={date !== null}
      onClose={onClose}
      title={interpolate(t.calendar.sheetTitleTemplate, { date: dateLabel })}
      subtitle={t.calendar.sheetHint}
    >
      {tasks.length === 0 ? (
        <p className="tp-muted py-6 text-center text-sm">{t.calendar.sheetEmpty}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const quadrant = quadrantOf(task, threshold);
            const badgeKey = `q${quadrant}` as keyof typeof t.task.badge;
            const hasDue = typeof task.dueAt === 'number';
            const dueText = hasDue
              ? new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(task.dueAt as number))
              : t.task.noDue;

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  onEdit(task);
                  onClose();
                }}
                className="tp-surface tp-focus flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-all duration-200 hover:border-brand/40"
              >
                <span
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForImportance(task.importance, colorMap) }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm font-semibold',
                      task.status === 'done' && 'line-through opacity-55',
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="tp-muted mt-0.5 block text-xs">
                    {task.status === 'done' ? t.task.done : dueText}
                  </span>
                </span>
                <span className="tp-pill shrink-0 bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-red-300">
                  {t.task.badge[badgeKey]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
