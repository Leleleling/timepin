import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppSettings, Task } from '../../db/models';
import { useAppStore } from '../../store/useAppStore';
import { colorForImportance } from '../../utils/calendar';
import { buildYearMonths, countTasksInKeys } from '../../utils/calendarViews';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';

export interface YearGridProps {
  year: number;
  today: Date;
  groups: Map<string, Task[]>;
  colorMap: AppSettings['colorMap'];
  onPrev: () => void;
  onNext: () => void;
  onSelectMonth: (month: number) => void;
}

/** 年视图：12 个月缩略卡，每月显示任务数与最重要任务的颜色点，点击进入月视图。 */
export function YearGrid({
  year,
  today,
  groups,
  colorMap,
  onPrev,
  onNext,
  onSelectMonth,
}: YearGridProps) {
  const t = useDict();
  const language = useAppStore((state) => state.language);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const months = buildYearMonths(year);
  const yearKeys = months.flatMap((item) => item.keys);
  const yearTotal = countTasksInKeys(groups, yearKeys);

  const monthlyTasks = (keys: string[]): Task[] =>
    keys.flatMap((key) => groups.get(key) ?? []);

  return (
    <section className="tp-surface tp-pop-in p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.prev} onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[5rem] text-center text-base font-semibold">
            {interpolate(t.calendarViews.yearTitleTemplate, { year })}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.calendarViews.next} onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
          {interpolate(t.calendarViews.yearTotalTemplate, { count: yearTotal })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => {
          const items = monthlyTasks(month.keys);
          const colors = [...items]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 3)
            .map((task) => colorForImportance(task.importance, colorMap));
          const isCurrentMonth = year === today.getFullYear() && month.month === today.getMonth();
          const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
            new Date(year, month.month, 1),
          );

          return (
            <button
              key={month.month}
              type="button"
              onClick={() => onSelectMonth(month.month)}
              aria-label={`${label} · ${interpolate(t.calendarViews.monthCountTemplate, { count: items.length })}`}
              className={`tp-focus flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all duration-200 hover:border-brand/40 hover:bg-brand/5 ${
                isCurrentMonth ? 'border-brand/50 bg-brand-soft/60' : 'tp-border border'
              }`}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="tp-muted text-xs">
                {interpolate(t.calendarViews.monthCountTemplate, { count: items.length })}
              </span>
              <span className="flex h-2 items-center gap-1">
                {colors.map((color, index) => (
                  <span
                    key={`${month.month}-${index}`}
                    className="h-1.5 w-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {yearTotal === 0 ? (
        <p className="tp-muted mt-4 text-center text-xs">{t.calendarViews.emptyYear}</p>
      ) : null}
    </section>
  );
}
