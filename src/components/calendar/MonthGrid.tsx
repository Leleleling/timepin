import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useAppStore } from '../../store/useAppStore';
import { useDict } from '../../utils/i18n';
import { barsForDay, buildMonthCells, dateKey } from '../../utils/calendar';
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
}

/** 七列月视图：日期数字、今日高亮与每天最多三条 3px 色带。 */
export function MonthGrid({
  year,
  month,
  today,
  groups,
  colorMap,
  onPrev,
  onNext,
  onSelect,
}: MonthGridProps) {
  const t = useDict();
  const language = useAppStore((state) => state.language);
  const cells = buildMonthCells(year, month);
  const monthTitle = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month, 1));

  return (
    <section className="tp-surface tp-pop-in p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.action.back} onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[7rem] text-center text-base font-semibold">{monthTitle}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.action.done} onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-red-300">
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
          const bars = barsForDay(groups.get(key) ?? [], colorMap);
          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key, new Date(year, month, day))}
              aria-label={`${monthTitle} ${day}`}
              className="tp-focus tp-border flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-transparent p-1 transition-all duration-200 hover:border-brand/30 hover:bg-brand/5"
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-brand text-white shadow-sm',
                )}
              >
                {day}
              </span>
              <span className="flex h-3 w-full flex-col items-center justify-start gap-[2px]">
                {bars.map((bar) => (
                  <span
                    key={bar.taskId}
                    className="tp-colorbar w-4/5"
                    style={{ backgroundColor: bar.color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="tp-muted mt-4 text-xs">{t.calendar.barsLegend}</p>
    </section>
  );
}
