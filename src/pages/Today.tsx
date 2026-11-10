import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  History,
  ListChecks,
  Plus,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { TaskCard } from '../components/task/TaskCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../components/ui/cn';
import type { Task } from '../db/models';
import { useNow } from '../hooks/useNow';
import { useTasks } from '../hooks/useTasks';
import { useAppStore, type FilterKey } from '../store/useAppStore';
import { addCalendarDays } from '../utils/taskForm';
import { interpolate, useDict } from '../utils/i18n';
import { formatLunarDate } from '../utils/lunar';
import { quadrantOf, sortTasks, type SortKey } from '../utils/sorting';
import { calculateUrgency } from '../utils/urgency';
import { taskMatches } from '../utils/search';

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function Today() {
  const t = useDict();
  const {
    tasks,
    settings,
    profile,
    completeTask,
    togglePin,
    postponeTask,
    softDelete,
    bulkUpdate,
    setSubtaskDone,
  } = useTasks();
  const navigate = useNavigate();

  // 失败反馈与撤销已由 useTasks 的统一 Toast 层负责；这里只兜住未处理的 rejection 并留日志。
  const run = (work: Promise<void>) =>
    void work.catch((error: unknown) =>
      console.error('[timepin] Task action rejected', error),
    );
  const safeAction = (fn: (task: Task) => Promise<void>) => (task: Task) => run(fn(task));

  const language = useAppStore((state) => state.language);
  const filter = useAppStore((state) => state.filter);
  const setFilter = useAppStore((state) => state.setFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const selectionMode = useAppStore((state) => state.selectionMode);
  const selectedIds = useAppStore((state) => state.selectedIds);
  const setSelectionMode = useAppStore((state) => state.setSelectionMode);
  const toggleSelection = useAppStore((state) => state.toggleSelection);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const setTagFilter = useAppStore((state) => state.setTagFilter);
  const sortKey = useAppStore((state) => state.sortKey);
  const setSortKey = useAppStore((state) => state.setSortKey);
  const importanceFilter = useAppStore((state) => state.importanceFilter);
  const setImportanceFilter = useAppStore((state) => state.setImportanceFilter);
  const dueFilter = useAppStore((state) => state.dueFilter);
  const setDueFilter = useAppStore((state) => state.setDueFilter);
  const searchHistory = useAppStore((state) => state.searchHistory);
  const pushSearchHistory = useAppStore((state) => state.pushSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);

  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const now = useNow();

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'trash' && task.status !== 'archived'),
    [tasks],
  );
  const sorted = useMemo(
    () => sortTasks(activeTasks, settings, now, sortKey),
    [activeTasks, settings, now, sortKey],
  );
  const q1Count = useMemo(
    () =>
      sorted.filter(
        (task) =>
          task.status !== 'done' && quadrantOf(task, settings.urgencyThreshold) === 1,
      ).length,
    [sorted, settings.urgencyThreshold],
  );

  const visible = useMemo(() => {
    const dayStart = startOfDay(now);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

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
      // U17–U19：标签、重要度、有无截止日期与增强搜索（含备注/子任务）叠加。
      if (tagFilter && !task.tags.includes(tagFilter)) return false;
      if (importanceFilter > 0 && task.importance !== importanceFilter) return false;
      const hasDue = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt);
      if (dueFilter === 'with' && !hasDue) return false;
      if (dueFilter === 'without' && hasDue) return false;
      return taskMatches(task, searchQuery);
    });
  }, [sorted, filter, searchQuery, now, tagFilter, importanceFilter, dueFilter]);

  // U11：已完成单独成组，默认收起，不再占据主列表的视觉重心。
  const unfinished = useMemo(
    () => visible.filter((task) => task.status !== 'done'),
    [visible],
  );
  const completed = useMemo(
    () => visible.filter((task) => task.status === 'done'),
    [visible],
  );
  const pinned = useMemo(
    () => unfinished.filter((task) => task.pinned),
    [unfinished],
  );

  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.id));

  const applyBulk = (makePatch: (task: Task) => Partial<Task>) => {
    if (selectedTasks.length === 0) return;
    run(
      bulkUpdate(
        selectedTasks.map((task) => ({ id: task.id, patch: makePatch(task) })),
      ),
    );
    clearSelection();
    setSelectionMode(false);
  };

  /** U12：点击一次就给全部置顶任务赋好顺序，再交换相邻两项。 */
  const movePinned = (task: Task, direction: -1 | 1) => {
    const index = pinned.findIndex((item) => item.id === task.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= pinned.length) return;
    const patches = pinned.map((item, position) => ({
      id: item.id,
      patch: {
        manualOrder:
          position === index ? target : position === target ? index : position,
      },
    }));
    run(bulkUpdate(patches));
  };

  const renderCard = (task: Task) => {
    const pinnedIndex = pinned.findIndex((item) => item.id === task.id);
    return (
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
        onDelete={(item) => setPendingDelete(item)}
        onEdit={(item) => openTaskModal(undefined, item.id)}
        selectionMode={selectionMode}
        selected={selectedIds.includes(task.id)}
        onToggleSelect={(item) => toggleSelection(item.id)}
        onMoveUp={task.pinned ? (item) => movePinned(item, -1) : undefined}
        onMoveDown={task.pinned ? (item) => movePinned(item, 1) : undefined}
        canMoveUp={pinnedIndex > 0}
        canMoveDown={pinnedIndex >= 0 && pinnedIndex < pinned.length - 1}
        onToggleSubtask={(item, subtaskId) => run(setSubtaskDone(item, subtaskId))}
        onOpenDetail={(item) => navigate(`/task/${item.id}`)}
        highlightQuery={searchQuery}
      />
    );
  };

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
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'smart', label: t.featuresExtra.sortSmart },
    { key: 'due', label: t.featuresExtra.sortDue },
    { key: 'importance', label: t.featuresExtra.sortImportance },
    { key: 'created', label: t.featuresExtra.sortCreated },
    { key: 'manual', label: t.featuresExtra.sortManual },
  ];
  const importanceOptions = [
    { value: 0, label: t.featuresExtra.importanceAll },
    { value: 1, label: t.task.importance.low },
    { value: 2, label: t.task.importance.medium },
    { value: 3, label: t.task.importance.high },
  ];
  const dueOptions = [
    { value: 'any' as const, label: t.featuresExtra.dueAny },
    { value: 'with' as const, label: t.featuresExtra.dueWith },
    { value: 'without' as const, label: t.featuresExtra.dueWithout },
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
        <Button
          variant={selectionMode ? 'soft' : 'ghost'}
          size="sm"
          className="ml-auto shrink-0"
          aria-pressed={selectionMode}
          onClick={() => setSelectionMode(!selectionMode)}
        >
          <ListChecks className="h-4 w-4" />
          {selectionMode ? t.bulkExtra.exitSelect : t.bulkExtra.selectMode}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="tp-label">{t.featuresExtra.sortLabel}</span>
        <div className="flex flex-wrap gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]">
          {sortOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={sortKey === item.key}
              onClick={() => setSortKey(item.key)}
              className={cn(
                'tp-segment cursor-pointer',
                sortKey === item.key ? 'tp-segment-active' : 'tp-segment-idle',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant={advancedOpen ? 'soft' : 'ghost'}
          size="sm"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {advancedOpen ? t.featuresExtra.filterHide : t.featuresExtra.filterShow}
        </Button>
      </div>

      {advancedOpen ? (
        <section className="tp-surface p-4">
          <h3 className="tp-label">{t.featuresExtra.advancedFilter}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="tp-label mb-2">{t.featuresExtra.importanceFilter}</p>
              <div className="flex flex-wrap gap-1">
                {importanceOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={importanceFilter === item.value}
                    onClick={() => setImportanceFilter(item.value)}
                    className={cn(
                      'tp-pill cursor-pointer border py-1.5',
                      importanceFilter === item.value
                        ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/20'
                        : 'tp-border tp-muted',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="tp-label mb-2">{t.featuresExtra.dueFilter}</p>
              <div className="flex flex-wrap gap-1">
                {dueOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={dueFilter === item.value}
                    onClick={() => setDueFilter(item.value)}
                    className={cn(
                      'tp-pill cursor-pointer border py-1.5',
                      dueFilter === item.value
                        ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/20'
                        : 'tp-border tp-muted',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tagFilter ? (
        <div className="tp-surface flex flex-wrap items-center gap-2 p-3 text-xs">
          <Tag className="h-4 w-4 text-brand" />
          <span>{interpolate(t.featuresExtra.tagsFilterTemplate, { tag: tagFilter })}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setTagFilter(null)}
          >
            <X className="h-3.5 w-3.5" />
            {t.featuresExtra.tagsFilterClear}
          </Button>
        </div>
      ) : null}

      {!searchQuery && searchHistory.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <History className="h-4 w-4 tp-muted" />
          <span className="tp-muted text-xs">{t.featuresExtra.searchHistory}</span>
          {searchHistory.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSearchQuery(item);
                pushSearchHistory(item);
              }}
              className="tp-pill tp-border cursor-pointer border"
            >
              {item}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearSearchHistory}>
            {t.featuresExtra.searchHistoryClear}
          </Button>
        </div>
      ) : null}

      {selectionMode ? (
        <div className="tp-surface flex flex-wrap items-center gap-2 p-3">
          <span className="tp-label mr-1">
            {interpolate(t.bulkExtra.selectedTemplate, { count: selectedIds.length })}
          </span>
          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => applyBulk(() => ({ status: 'done' }))}
          >
            <CheckCheck className="h-4 w-4" />
            {t.bulkExtra.bulkComplete}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() =>
              applyBulk((task) => {
                const dueAt =
                  typeof task.dueAt === 'number' ? addCalendarDays(task.dueAt, 1) : undefined;
                return {
                  dueAt,
                  urgencyScore:
                    typeof dueAt === 'number'
                      ? calculateUrgency(dueAt, profile)
                      : task.urgencyScore,
                };
              })
            }
          >
            <CalendarClock className="h-4 w-4" />
            {t.bulkExtra.bulkPostpone}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => {
              setTagDraft('');
              setTagDialogOpen(true);
            }}
          >
            <Tag className="h-4 w-4" />
            {t.bulkExtra.bulkTag}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() =>
              applyBulk((task) => ({
                status: 'trash',
                preTrashStatus: task.status,
              }))
            }
          >
            <Trash2 className="h-4 w-4" />
            {t.bulkExtra.bulkDelete}
          </Button>
        </div>
      ) : null}

      {unfinished.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="tp-label">{t.task.listTitle}</span>
            <span className="tp-muted text-xs">
              {interpolate(t.today.resultTemplate, { count: unfinished.length })}
            </span>
          </div>
          {unfinished.map(renderCard)}
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
      ) : completed.length === 0 ? (
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
      ) : null}

      {completed.length > 0 ? (
        <section className="tp-surface p-4">
          <button
            type="button"
            aria-expanded={completedOpen}
            onClick={() => setCompletedOpen((open) => !open)}
            className="tp-focus flex w-full cursor-pointer items-center justify-between gap-3 text-sm font-semibold"
          >
            <span>
              {interpolate(t.bulkExtra.completedGroupTemplate, { count: completed.length })}
            </span>
            <span className="tp-muted flex items-center gap-1 text-xs font-normal">
              {completedOpen ? t.bulkExtra.hideCompleted : t.bulkExtra.showCompleted}
              {completedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>
          {completedOpen ? (
            <div className="mt-3 space-y-2.5">{completed.map(renderCard)}</div>
          ) : null}
        </section>
      ) : null}

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

      {/* U8：软删前二次确认；确认后仍保留 Toast 撤销作为第二道防线。 */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t.bulkExtra.deleteConfirmTitle}
        subtitle={t.bulkExtra.deleteConfirmBody}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t.action.cancel}
            </Button>
            <Button
              onClick={() => {
                const item = pendingDelete;
                setPendingDelete(null);
                if (item) run(softDelete(item));
              }}
            >
              {t.action.remove}
            </Button>
          </>
        }
      >
        <p className="tp-muted text-sm">{pendingDelete?.title}</p>
      </Modal>

      <Modal
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        title={t.bulkExtra.bulkTag}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTagDialogOpen(false)}>
              {t.action.cancel}
            </Button>
            <Button
              disabled={tagDraft.trim().length === 0}
              onClick={() => {
                const tag = tagDraft.trim();
                setTagDialogOpen(false);
                if (tag) {
                  applyBulk((task) => ({
                    tags: Array.from(new Set([...task.tags, tag])),
                  }));
                }
              }}
            >
              {t.bulkExtra.tagConfirm}
            </Button>
          </>
        }
      >
        <input
          type="text"
          value={tagDraft}
          placeholder={t.bulkExtra.tagPlaceholder}
          aria-label={t.bulkExtra.tagPlaceholder}
          autoFocus
          onChange={(event) => setTagDraft(event.target.value)}
          className="tp-focus tp-border tp-surface h-11 w-full rounded-lg border px-3 text-sm"
        />
      </Modal>
    </div>
  );
}
