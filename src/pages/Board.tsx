import { useState, type DragEvent } from 'react';
import { LayoutGrid, MoveRight, RotateCcw } from 'lucide-react';
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
    badge: 'bg-sun-soft text-[#9A6200] dark:bg-sun/20 dark:text-sun',
  },
  {
    key: 'q3',
    value: 3,
    bar: 'bg-sun/60',
    badge: 'bg-sun-soft text-[#9A6200] dark:bg-sun/20 dark:text-sun',
  },
  { key: 'q4', value: 4, bar: 'bg-muted', badge: 'bg-black/5 tp-muted dark:bg-white/10' },
];

export default function Board() {
  const t = useDict();
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const { tasks, settings, updateTask } = useTasks();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<Quadrant | null>(null);
  const [moveTarget, setMoveTarget] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const grouped = groupByQuadrant(tasks, settings.urgencyThreshold);
  const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
  const overridden = tasks.filter((task) => task.boardQuadrant !== undefined);

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
        <p role="status" className="text-xs font-medium text-[#16794A] dark:text-[#7BD8A0]">
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
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', task.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverKey(null);
                      }}
                      className={cn(
                        'tp-border flex cursor-grab items-center gap-2 rounded-lg border px-2 py-2 transition-all duration-200 active:cursor-grabbing',
                        draggingId === task.id && 'opacity-45',
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          task.pinned ? 'bg-brand' : 'bg-muted',
                        )}
                      />
                      <button
                        type="button"
                        title={t.board.editHint}
                        onClick={() => openTaskModal(undefined, task.id)}
                        className={cn(
                          'tp-focus min-w-0 flex-1 cursor-pointer truncate text-left text-sm',
                          task.status === 'done' && 'line-through opacity-55',
                        )}
                      >
                        {task.title}
                      </button>
                      {task.boardQuadrant !== undefined ? (
                        <span className="tp-pill shrink-0 bg-sun-soft text-[#9A6200] dark:bg-sun/20 dark:text-sun">
                          {t.boardDrag.manualBadge}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={t.boardDrag.moveAction}
                        title={t.boardDrag.moveAction}
                        onClick={() => setMoveTarget(task)}
                        className="tp-focus tp-muted shrink-0 cursor-pointer rounded-md p-1 transition-all duration-200 hover:bg-brand/10 hover:text-brand"
                      >
                        <MoveRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="tp-muted mt-3 text-xs">{t.boardDrag.dropHint}</p>
              )}
            </article>
          );
        })}
      </div>

      <p className="tp-muted text-xs">{t.boardDrag.dragHint}</p>

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
