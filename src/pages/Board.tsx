import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CalendarClock,
  Check,
  LayoutGrid,
  MoveRight,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { cn } from '../components/ui/cn';
import { Modal } from '../components/ui/Modal';
import type { Task } from '../db/models';
import { useTasks } from '../hooks/useTasks';
import { useAppStore } from '../store/useAppStore';
import {
  assignQuadrantPatch,
  clearQuadrantPatch,
  groupByQuadrant,
} from '../utils/board';
import { interpolate, useDict } from '../utils/i18n';
import type { Quadrant } from '../utils/sorting';
import { Button } from '../components/ui/Button';

type QuadrantKey = 'q1' | 'q2' | 'q3' | 'q4';

const quadrants: { key: QuadrantKey; value: Quadrant; bar: string; badge: string }[] = [
  {
    key: 'q1',
    value: 1,
    bar: 'bg-brand',
    badge: 'bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-brand-deep',
  },
  {
    key: 'q2',
    value: 2,
    bar: 'bg-sun',
    badge: 'bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning',
  },
  {
    key: 'q3',
    value: 3,
    bar: 'bg-sun/60',
    badge: 'bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning',
  },
  { key: 'q4', value: 4, bar: 'bg-muted', badge: 'bg-black/5 tp-muted dark:bg-white/10' },
];

interface BoardRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onMove: (task: Task) => void;
  onComplete: (task: Task) => void;
  onPostpone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAssign: (id: string, quadrant: Quadrant) => void;
  onDragState: (id: string | null, over: Quadrant | null) => void;
  draggingId: string | null;
  t: ReturnType<typeof useDict>;
}

/**
 * 桌面保留 HTML5 draggable；触屏用 Pointer Events 长按启动拖拽，
 * 通过 elementFromPoint 找到目标象限，pointerup 落位（U20）。
 * 完成/延后/删除改为行内按钮，避免与长按手势争抢同一条滑动手势（U21）。
 */
function BoardRow({
  task,
  onEdit,
  onMove,
  onComplete,
  onPostpone,
  onDelete,
  onAssign,
  onDragState,
  draggingId,
  t,
}: BoardRowProps) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [touchDragging, setTouchDragging] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const done = task.status === 'done';
  const hasDue = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const quadrantAt = (x: number, y: number): Quadrant | null => {
    const element = document.elementFromPoint(x, y);
    const value = element?.closest('[data-quadrant]')?.getAttribute('data-quadrant');
    const parsed = Number(value);
    return value && [1, 2, 3, 4].includes(parsed) ? (parsed as Quadrant) : null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    origin.current = { x: event.clientX, y: event.clientY };
    const { x, y } = origin.current;
    timer.current = window.setTimeout(() => {
      setTouchDragging(true);
      setGhost({ x, y });
      onDragState(task.id, null);
    }, 300);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    if (!touchDragging) {
      const moved =
        Math.abs(event.clientX - origin.current.x) > 8 ||
        Math.abs(event.clientY - origin.current.y) > 8;
      if (moved) clearTimer();
      return;
    }
    event.preventDefault();
    setGhost({ x: event.clientX, y: event.clientY });
    onDragState(task.id, quadrantAt(event.clientX, event.clientY));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    clearTimer();
    if (touchDragging) {
      const target = quadrantAt(event.clientX, event.clientY);
      if (target) onAssign(task.id, target);
    }
    setTouchDragging(false);
    setGhost(null);
    onDragState(null, null);
  };

  return (
    <>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', task.id);
          event.dataTransfer.effectAllowed = 'move';
          onDragState(task.id, null);
        }}
        onDragEnd={() => onDragState(null, null)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'tp-border flex items-center gap-1.5 rounded-lg border px-2 py-2 transition-all duration-200',
          draggingId === task.id && 'opacity-45',
          touchDragging && 'ring-2 ring-brand/50',
        )}
        style={{ touchAction: touchDragging ? 'none' : 'pan-y' }}
      >
        <button
          type="button"
          aria-label={done ? t.task.done : t.action.complete}
          aria-pressed={done}
          onClick={() => onComplete(task)}
          className={cn('tp-check !h-5 !w-5 shrink-0', done && 'border-brand bg-brand text-white')}
        >
          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </button>
        <button
          type="button"
          title={t.board.editHint}
          onClick={() => onEdit(task)}
          className={cn(
            'tp-focus min-w-0 flex-1 cursor-pointer truncate text-left text-sm',
            done && 'line-through opacity-55',
          )}
        >
          {task.title}
        </button>
        {task.boardQuadrant !== undefined ? (
          <span className="tp-pill shrink-0 bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning">
            {t.boardDrag.manualBadge}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={t.action.postpone}
          title={t.action.postpone}
          disabled={!hasDue || done}
          onClick={() => onPostpone(task)}
          className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 disabled:opacity-35 hover:text-brand"
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={t.action.edit}
          title={t.action.edit}
          onClick={() => onEdit(task)}
          className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 hover:text-brand"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={t.action.remove}
          title={t.action.remove}
          onClick={() => onDelete(task)}
          className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 hover:text-brand"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={t.boardDrag.moveAction}
          title={t.boardDrag.moveAction}
          onClick={() => onMove(task)}
          className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 hover:text-brand"
        >
          <MoveRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {ghost ? (
        <div
          className="pointer-events-none fixed z-50 max-w-[220px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white shadow-lift"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {task.title}
        </div>
      ) : null}
    </>
  );
}

export default function Board() {
  const t = useDict();
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const { tasks, settings, updateTask, completeTask, postponeTask, softDelete } = useTasks();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<Quadrant | null>(null);
  const [moveTarget, setMoveTarget] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const run = (work: Promise<void>) =>
    void work.catch((error: unknown) => console.error('[timepin] Board action rejected', error));

  const grouped = groupByQuadrant(tasks, settings.urgencyThreshold);
  const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
  const overridden = tasks.filter(
    (task) =>
      task.boardQuadrant !== undefined &&
      task.status !== 'trash' &&
      task.status !== 'archived',
  );

  const assign = (id: string, quadrant: Quadrant) => {
    setFeedback(null);
    void updateTask(id, assignQuadrantPatch(quadrant))
      .then(() => setFeedback(t.boardDrag.movedOk))
      .catch(() => setFeedback(t.feedback.saveError));
  };

  const restoreAuto = () => {
    setFeedback(null);
    void Promise.all(overridden.map((task) => updateTask(task.id, clearQuadrantPatch())))
      .then(() => setFeedback(t.boardDrag.restoreDone))
      .catch(() => setFeedback(t.feedback.saveError));
  };

  const drop = (event: DragEvent<HTMLElement>, quadrant: Quadrant) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    if (id) assign(id, quadrant);
    setDraggingId(null);
    setOverKey(null);
  };

  return (
    <div className="tp-rise space-y-5">
      <section className="tp-surface flex flex-wrap items-center gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15">
          <LayoutGrid className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{t.boardDrag.hintTitle}</h2>
          <p className="tp-muted mt-1.5 text-sm leading-relaxed">{t.boardDrag.hintBody}</p>
        </div>
        {overridden.length > 0 ? (
          <Button variant="outline" size="sm" onClick={restoreAuto}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t.boardDrag.restoreAuto}
          </Button>
        ) : null}
      </section>

      {feedback ? (
        <p role="status" className="text-xs font-medium text-success">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {quadrants.map((item) => {
          const list = grouped[item.value];
          const isOver = overKey === item.value;
          return (
            <article
              key={item.key}
              data-quadrant={item.value}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverKey(item.value);
              }}
              onDragLeave={() => setOverKey(null)}
              onDrop={(event) => drop(event, item.value)}
              className={cn(
                'tp-surface tp-pop-in relative overflow-hidden p-5 transition-all duration-200',
                isOver && 'ring-2 ring-brand/60 bg-brand/5',
              )}
            >
              <span className={cn('absolute left-0 top-0 h-full w-1', item.bar)} />
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{t.board.quadrants[item.key].title}</h3>
                <span className={cn('tp-pill shrink-0', item.badge)}>
                  {interpolate(t.board.countTemplate, { count: list.length })}
                </span>
              </div>
              <p className="tp-muted mt-2 text-xs leading-relaxed">
                {t.board.quadrants[item.key].body}
              </p>

              {list.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {list.map((task) => (
                    <BoardRow
                      key={task.id}
                      task={task}
                      t={t}
                      draggingId={draggingId}
                      onDragState={(id, over) => {
                        setDraggingId(id);
                        setOverKey(over);
                      }}
                      onEdit={(item) => openTaskModal(undefined, item.id)}
                      onMove={setMoveTarget}
                      onComplete={(item) => run(completeTask(item))}
                      onPostpone={(item) => run(postponeTask(item))}
                      onDelete={(item) => run(softDelete(item))}
                      onAssign={assign}
                    />
                  ))}
                </div>
              ) : (
                <p className="tp-muted mt-3 text-xs">{t.boardDrag.dropHint}</p>
              )}
            </article>
          );
        })}
      </div>

      <p className="tp-muted text-xs">{t.featuresExtra.dragHint}</p>

      {total === 0 ? (
        <section className="tp-surface p-8 text-center">
          <h3 className="text-base font-semibold">{t.board.emptyTitle}</h3>
          <p className="tp-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            {t.board.emptyBody}
          </p>
        </section>
      ) : null}

      <Modal
        variant="sheet"
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        title={t.boardDrag.moveTitle}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {quadrants.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (moveTarget) assign(moveTarget.id, item.value);
                setMoveTarget(null);
              }}
              className="tp-focus tp-border cursor-pointer rounded-lg border px-3 py-3 text-left text-sm font-medium transition-all duration-200 hover:border-brand/40 hover:bg-brand/5"
            >
              {t.board.quadrants[item.key].title}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
