import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { DaySheet } from '../components/calendar/DaySheet';
import { DayView } from '../components/calendar/DayView';
import { MonthGrid } from '../components/calendar/MonthGrid';
import { WeekGrid } from '../components/calendar/WeekGrid';
import { YearGrid } from '../components/calendar/YearGrid';
import { cn } from '../components/ui/cn';
import { useTasks } from '../hooks/useTasks';
import { useAppStore } from '../store/useAppStore';
import { dateKey, groupTasksByDate } from '../utils/calendar';
import { useDict } from '../utils/i18n';

type CalendarView = 'year' | 'month' | 'week' | 'day';

interface Selection {
  key: string;
  date: Date;
}

/** 日历容器：四档视图共用同一份分组 Map，统一管理游标与 Bottom Sheet。 */
export default function Calendar() {
  const t = useDict();
  const language = useAppStore((state) => state.language);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const { tasks, settings } = useTasks();

  const today = new Date();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [anchor, setAnchor] = useState<Date>(today);
  const [selection, setSelection] = useState<Selection | null>(null);

  const groups = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const views: CalendarView[] = ['year', 'month', 'week', 'day'];
  const dayKey = dateKey(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const dayTasks = groups.get(dayKey) ?? [];
  const hints: Record<CalendarView, string> = {
    year: t.calendarViews.hintYear,
    month: t.calendarViews.hintMonth,
    week: t.calendarViews.hintWeek,
    day: t.calendarViews.hintDay,
  };

  const goToday = () => {
    const now = new Date();
    setAnchor(now);
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const shift = (delta: number) => {
    if (view === 'year') {
      setCursor((previous) => ({ ...previous, year: previous.year + delta }));
      return;
    }
    if (view === 'month') {
      const next = new Date(cursor.year, cursor.month + delta, 1);
      setCursor({ year: next.getFullYear(), month: next.getMonth() });
      setAnchor(next);
      return;
    }
    const days = view === 'week' ? 7 : 1;
    const next = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + days * delta);
    setAnchor(next);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  const selectDay = (key: string, date: Date) => setSelection({ key, date });

  return (
    <div className="tp-rise space-y-5">
      <div className="tp-surface flex gap-1 p-1.5">
        {views.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={view === item}
            onClick={() => setView(item)}
            className={cn(
              'tp-segment flex-1 cursor-pointer',
              view === item ? 'tp-segment-active' : 'tp-segment-idle',
            )}
          >
            {t.calendar.views[item]}
          </button>
        ))}
      </div>

      {view === 'year' ? (
        <YearGrid
          year={cursor.year}
          today={today}
          groups={groups}
          colorMap={settings.colorMap}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onSelectMonth={(month) => {
            setCursor((previous) => ({ ...previous, month }));
            setAnchor(new Date(cursor.year, month, 1));
            setView('month');
          }}
        />
      ) : null}

      {view === 'month' ? (
        <MonthGrid
          year={cursor.year}
          month={cursor.month}
          today={today}
          groups={groups}
          colorMap={settings.colorMap}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onSelect={selectDay}
        />
      ) : null}

      {view === 'week' ? (
        <WeekGrid
          anchor={anchor}
          today={today}
          groups={groups}
          colorMap={settings.colorMap}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onThisWeek={goToday}
          onSelect={selectDay}
        />
      ) : null}

      {view === 'day' ? (
        <DayView
          date={anchor}
          tasks={dayTasks}
          colorMap={settings.colorMap}
          threshold={settings.urgencyThreshold}
          language={language}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={goToday}
          onEdit={(task) => openTaskModal(undefined, task.id)}
          onCreate={() => openTaskModal()}
          onOpenSheet={() => selectDay(dayKey, anchor)}
        />
      ) : null}

      <section className="tp-surface flex gap-3 p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sun-soft text-sun">
          <Info className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t.calendar.hintTitle}</h3>
          <p className="tp-muted mt-1.5 text-sm leading-relaxed">{hints[view]}</p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            <span className="tp-colorbar w-10 bg-brand" />
            <span className="tp-colorbar w-10 bg-sun" />
            <span className="tp-colorbar w-10 bg-muted" />
          </div>
        </div>
      </section>

      <DaySheet
        date={selection?.date ?? null}
        tasks={selection ? (groups.get(selection.key) ?? []) : []}
        colorMap={settings.colorMap}
        threshold={settings.urgencyThreshold}
        language={language}
        onClose={() => setSelection(null)}
        onEdit={(task) => openTaskModal(undefined, task.id)}
      />
    </div>
  );
}
