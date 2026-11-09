import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useAppStore } from '../../store/useAppStore';
import { colorForImportance, dateKey } from '../../utils/calendar';
import { buildWeekDays } from '../../utils/calendarViews';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface WeekGridProps {
  anchor: Date;
  today: Date;
  groups: Map<string, Task[]>;
  colorMap: AppSettings['colorMap'];
  onPrev: () => void;
  onNext: () => void;
  onThisWeek: () => void;
  onSelect: (key: string, date: Date) => void;
}

/** 周视图：周一至周日七张日卡，移动端纵向堆叠，点击任一天复用 Bottom Sheet。 */
export function WeekGrid({
  anchor,
  today,
  groups,
  colorMap,
  onPrev,
  onNext,
  onThisWeek,
  onSelect,
}: WeekGridProps) {
  const t = useDict();
  const language = useAppStore((state) => state.language);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const week = buildWeekDays(anchor);
  const dayLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  const rangeLabel = interpolate(t.calendarViews.weekRangeTemplate, {
    start: dayLabel(week[0].date),
    end: dayLabel(week[6].date),
  });
  const weekTotal = week.reduce((sum, day) => sum + (groups.get(day.key)?.length ?? 0), 0);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <section className="tp-surface tp-pop-in p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.prev} onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[9rem] text-center text-sm font-semibold">{rangeLabel}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.next} onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onThisWeek}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t.calendarViews.thisWeek}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {week.map((day, index) => {
          const items = groups.get(day.key) ?? [];
          const isToday = day.key === todayKey;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.key, day.date)}
              aria-label={`${dayLabel(day.date)} · ${interpolate(t.calendarViews.monthCountTemplate, { count: items.length })}`}
              className={cn(
                'tp-focus tp-border flex min-h-[6rem] cursor-pointer flex-col gap-2 rounded-lg border p-2.5 text-left transition-all duration-200 hover:border-brand/40 hover:bg-brand/5',
                isToday && 'border-brand/50 bg-brand-soft/50 dark:bg-brand/10',
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="tp-label">{t.calendar.weekdays[index]}</span>
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isToday && 'bg-brand text-white',
                  )}
                >
                  {day.date.getDate()}
                </span>
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {items.length === 0 ? (
                  <span className="tp-muted text-[11px]">{t.calendarViews.emptyDay}</span>
                ) : (
                  items.slice(0, 3).map((task) => (
                    <span key={task.id} className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="tp-colorbar w-3 shrink-0"
                        style={{ backgroundColor: colorForImportance(task.importance, colorMap) }}
                      />
                      <span className="truncate text-[11px]">{task.title}</span>
                    </span>
                  ))
                )}
              </span>

              <span className="tp-muted text-[11px]">
                {interpolate(t.calendarViews.monthCountTemplate, { count: items.length })}
              </span>
            </button>
          );
        })}
      </div>

      {weekTotal === 0 ? (
        <p className="tp-muted mt-4 text-center text-xs">{t.calendarViews.emptyWeek}</p>
      ) : null}
    </section>
  );
}
