import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useAppStore } from '../../store/useAppStore';
import { useDict } from '../../utils/i18n';
import { colorForImportance, dateKey, buildMonthCells } from '../../utils/calendar';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface MonthGridProps {
  year: number;
  month: number;
  today: Date;
  groups: Map<string, Task[]>;
  colorMap: AppSettings['colorMap'];
  onPrev: () => void;
  onNext: () => void;
  onSelect: (key: string, date: Date) => void;
  /** U22：格子内直接新建（预填该日）与拖拽任务改期。 */
  onCreate?: (date: Date) => void;
  onReschedule?: (taskId: string, date: Date) => void;
}

/** 七列月视图：日期、今日高亮、任务标题色带、格子内新建与拖拽改期（U22/U24）。 */
export function MonthGrid({
  year,
  month,
  today,
  groups,
  colorMap,
  onPrev,
  onNext,
  onSelect,
  onCreate,
  onReschedule,
}: MonthGridProps) {
  const t = useDict();
  const language = useAppStore((state) => state.language);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const cells = buildMonthCells(year, month);
  const monthTitle = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month, 1));

  return (
    <section className="tp-surface tp-pop-in p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.prev} onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[7rem] text-center text-base font-semibold">{monthTitle}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.next} onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
          {t.calendar.todayBadge} · {today.getDate()}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {t.calendar.weekdays.map((weekday) => (
          <div key={weekday} className="tp-label pb-2">
            {weekday}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="aspect-square" />;
          const key = dateKey(year, month, day);
          const date = new Date(year, month, day);
          // 已完成任务不占用月视图的标题位，与首页/日历色带口径一致。
          const items = (groups.get(key) ?? []).filter((task) => task.status !== 'done');
          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          return (
            <div
              key={key}
              onDragOver={(event) => {
                if (!onReschedule) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOver(key);
              }}
              onDragLeave={() => setDragOver((current) => (current === key ? null : current))}
              onDrop={(event) => {
                if (!onReschedule) return;
                event.preventDefault();
                const taskId = event.dataTransfer.getData('text/plain');
                if (taskId) onReschedule(taskId, date);
                setDragOver(null);
              }}
              className={cn(
                'tp-border group relative flex aspect-square min-w-0 flex-col items-center gap-1 rounded-lg border border-transparent p-1 transition-all duration-200 hover:border-brand/30 hover:bg-brand/5',
                dragOver === key && 'border-brand bg-brand/10',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(key, date)}
                aria-label={`${monthTitle} ${day}`}
                className="tp-focus flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-medium"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    isToday && 'bg-brand text-white shadow-sm',
                  )}
                >
                  {day}
                </span>
              </button>

              {onCreate ? (
                <button
                  type="button"
                  aria-label={t.featuresExtra.createOnDate}
                  title={t.featuresExtra.createOnDate}
                  onClick={() => onCreate(date)}
                  className="tp-focus absolute right-0.5 top-0.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded bg-brand-soft text-brand-deep group-hover:flex dark:bg-brand/25 dark:text-white"
                >
                  <Plus className="h-3 w-3" />
                </button>
              ) : null}

              <div className="flex w-full min-w-0 flex-col items-center gap-[2px] overflow-hidden">
                {items.slice(0, 2).map((task) => {
                  const color = colorForImportance(task.importance, colorMap);
                  return (
                    <span
                      key={task.id}
                      draggable={Boolean(onReschedule)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', task.id);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      title={task.title}
                      className="flex w-full min-w-0 cursor-grab items-center gap-1 rounded px-0.5 text-left text-[9px] leading-tight active:cursor-grabbing"
                      style={{ color }}
                    >
                      <span
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{task.title}</span>
                    </span>
                  );
                })}
                {items.length > 2 ? (
                  <span className="tp-muted text-[9px] leading-none">+{items.length - 2}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="tp-muted mt-4 text-xs">{t.calendar.barsLegend}</p>
    </section>
  );
}
