import { useMemo } from 'react';
import { Plus, SearchX, Sparkles } from 'lucide-react';
import { TaskCard } from '../components/task/TaskCard';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import type { Task } from '../db/models';
import { useTasks } from '../hooks/useTasks';
import { useAppStore, type FilterKey } from '../store/useAppStore';
import { interpolate, useDict } from '../utils/i18n';
import { formatLunarDate } from '../utils/lunar';
import { quadrantOf, sortTasks } from '../utils/sorting';

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function Today() {
  const t = useDict();
  const { tasks, settings, completeTask, togglePin, postponeTask, softDelete } = useTasks();

  const safeAction = (fn: (task: Task) => Promise<void>) => (task: Task) => {
    void fn(task).catch(() => undefined);
  };

  const language = useAppStore((state) => state.language);
  const filter = useAppStore((state) => state.filter);
  const setFilter = useAppStore((state) => state.setFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const openTaskModal = useAppStore((state) => state.openTaskModal);

  const now = useMemo(() => Date.now(), [tasks, settings]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'trash' && task.status !== 'archived'),
    [tasks],
  );
  const sorted = useMemo(
    () => sortTasks(activeTasks, settings, now),
    [activeTasks, settings, now],
  );
  const q1Count = useMemo(
    () => sorted.filter((task) => quadrantOf(task, settings.urgencyThreshold) === 1).length,
    [sorted, settings.urgencyThreshold],
  );

  const visible = useMemo(() => {
    const dayStart = startOfDay(now);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const query = searchQuery.trim().toLowerCase();

    return sorted.filter((task) => {
      if (filter === 'today') {
        const anchor = typeof task.dueAt === 'number' ? task.dueAt : task.startAt;
        if (anchor < dayStart || anchor >= dayEnd || task.status === 'done') return false;
      }
      if (filter === 'overdue') {
        if (task.status === 'done' || typeof task.dueAt !== 'number' || task.dueAt >= now) {
          return false;
        }
      }
      if (!query) return true;
      return [task.title, task.content ?? '', ...task.tags]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [sorted, filter, searchQuery, now]);

  const dateText = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(now));
  const lunarText = formatLunarDate(new Date(now), language);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t.action.all },
    { key: 'today', label: t.action.today },
    { key: 'overdue', label: t.action.overdue },
  ];
  const legend = [
    { label: t.today.q1, color: 'bg-brand' },
    { label: t.today.q2, color: 'bg-sun' },
    { label: t.today.q3, color: 'bg-sun/60' },
    { label: t.today.q4, color: 'bg-muted' },
  ];

  return (
    <div className="tp-rise space-y-5">
      <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand via-brand to-brand-deep p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-black/10"
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {dateText}
            {lunarText ? ` · ${lunarText}` : ''}
          </p>
          <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight">
            {t.today.greeting}
          </h2>
          <p className="mt-2 text-sm text-white/80">{t.today.dateHint}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="tp-pill bg-white/20 text-white backdrop-blur-sm">
              {t.today.localCount} · {activeTasks.length}
            </span>
            <span className="tp-pill bg-white/20 text-white backdrop-blur-sm">Q1 · {q1Count}</span>
            <Button
              className="ml-auto bg-white text-brand-deep hover:bg-white/90"
              onClick={() => openTaskModal()}
            >
              <Plus className="h-4 w-4" />
              {t.action.add}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              'tp-focus tp-pill shrink-0 cursor-pointer border transition-all duration-200',
              filter === item.key
                ? 'border-transparent bg-brand text-white shadow-sm'
                : 'tp-border tp-muted hover:border-brand/40 hover:text-brand',
            )}
          >
            {item.label}
          </button>
        ))}
        <span className="tp-muted ml-auto hidden text-xs sm:block">{t.action.filter}</span>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="tp-label">{t.task.listTitle}</span>
            <span className="tp-muted text-xs">
              {interpolate(t.today.resultTemplate, { count: visible.length })}
            </span>
          </div>
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              colorMap={settings.colorMap}
              threshold={settings.urgencyThreshold}
              language={language}
              now={now}
              onComplete={safeAction(completeTask)}
              onTogglePin={safeAction(togglePin)}
              onPostpone={safeAction(postponeTask)}
              onDelete={safeAction(softDelete)}
              onEdit={(item) => openTaskModal(undefined, item.id)}
            />
          ))}
        </div>
      ) : activeTasks.length === 0 ? (
        <section className="tp-surface tp-pop-in p-8 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-brand-soft dark:bg-brand/10">
            <img src="/timepin.png" alt={t.app.name} className="h-20 w-20 object-contain" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">{t.today.emptyTitle}</h3>
          <p className="tp-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            {t.today.emptyBody}
          </p>
        </section>
      ) : (
        <section className="tp-surface tp-pop-in p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
            <SearchX className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t.task.emptyFilteredTitle}</h3>
          <p className="tp-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            {t.task.emptyFilteredBody}
          </p>
          <Button
            variant="soft"
            className="mt-5"
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
            }}
          >
            {t.task.clearSearch}
          </Button>
        </section>
      )}

      <section className="tp-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">{t.today.engineTitle}</h3>
            <p className="tp-label mt-0.5">{t.today.legendTitle}</p>
          </div>
        </div>
        <p className="tp-muted mt-3 text-sm leading-relaxed">{t.today.engineBody}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {legend.map((item) => (
            <div
              key={item.label}
              className="tp-border flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200 hover:border-brand/40"
            >
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.color)} />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="tp-divider my-4" />
        <p className="tp-muted text-xs leading-relaxed">{t.today.cardHint}</p>
      </section>
    </div>
  );
}
