import { ArrowLeft, CalendarClock, Check, Pencil, Share2, Tag as TagIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TaskNotes } from '../components/task/TaskNotes';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import { useTasks } from '../hooks/useTasks';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { taskToShareText } from '../utils/export';
import { useDict } from '../utils/i18n';
import { quadrantOf } from '../utils/sorting';

/** U15：独立的任务详情页，展示备注、子任务、状态与时间线。 */
export default function TaskDetail() {
  const t = useDict();
  const navigate = useNavigate();
  const { id } = useParams();
  const { tasks, settings, setSubtaskDone } = useTasks();
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const language = useAppStore((state) => state.language);
  const pushToast = useToastStore((state) => state.push);
  const task = tasks.find((item) => item.id === id);

  const dateFormatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!task) {
    return (
      <div className="tp-rise space-y-4">
        <section className="tp-surface p-8 text-center">
          <h2 className="text-base font-semibold">{t.featuresExtra.detailTitle}</h2>
          <p className="tp-muted mt-2 text-sm">{t.featuresExtra.detailNotFound}</p>
          <Button variant="soft" className="mt-5" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            {t.featuresExtra.detailBack}
          </Button>
        </section>
      </div>
    );
  }

  const quadrant = quadrantOf(task, settings.urgencyThreshold);
  const badgeKey = `q${quadrant}` as keyof typeof t.task.badge;
  const doneSubtasks = task.subtasks.filter((item) => item.done).length;
  const formatTime = (value: number) => dateFormatter.format(new Date(value));

  return (
    <div className="tp-rise space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          {t.featuresExtra.detailBack}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(taskToShareText(task))
              .then(() =>
                pushToast({ message: t.hardeningExtra.shareCopied, tone: 'success' }),
              )
              .catch((error: unknown) => {
                console.error('[timepin] Unable to copy share text', error);
                pushToast({ message: t.feedback.saveError, tone: 'error' });
              });
          }}
        >
          <Share2 className="h-4 w-4" />
          {t.hardeningExtra.shareTask}
        </Button>
        <Button
          variant="soft"
          size="sm"
          onClick={() => openTaskModal(undefined, task.id)}
        >
          <Pencil className="h-4 w-4" />
          {t.featuresExtra.detailEdit}
        </Button>
      </div>

      <section className="tp-surface p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
              task.status === 'done' ? 'border-brand bg-brand text-white' : 'tp-border',
            )}
          >
            {task.status === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className={cn(
                'break-words text-xl font-bold leading-snug',
                task.status === 'done' && 'tp-muted line-through',
              )}
            >
              {task.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/20">
                {t.task.badge[badgeKey]}
              </span>
              <span className="tp-muted text-xs">
                {t.featuresExtra.detailStatus} · {task.status}
              </span>
              {task.pinned ? (
                <span className="tp-pill bg-brand/10 text-brand">{t.task.pinned}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="tp-divider my-4" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 tp-muted" />
            <span>
              {typeof task.dueAt === 'number'
                ? `${t.task.due} · ${formatTime(task.dueAt)}`
                : t.task.noDue}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TagIcon className="h-4 w-4 tp-muted" />
            <span className="tp-muted">
              {task.tags.length > 0 ? task.tags.join(' · ') : t.task.noDue}
            </span>
          </div>
          <p className="tp-muted text-xs">
            {t.featuresExtra.detailCreated} · {formatTime(task.createdAt)}
          </p>
          <p className="tp-muted text-xs">
            {t.featuresExtra.detailUpdated} · {formatTime(task.updatedAt)}
          </p>
        </div>
      </section>

      {task.subtasks.length > 0 ? (
        <section className="tp-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t.task.subtasks}</h3>
            <span className="tp-muted text-xs tabular-nums">
              {doneSubtasks}/{task.subtasks.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand transition-all duration-200"
              style={{ width: `${Math.round((doneSubtasks / task.subtasks.length) * 100)}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {task.subtasks.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    void setSubtaskDone(task, item.id).catch((error: unknown) =>
                      console.error('[timepin] Unable to toggle subtask', error),
                    )
                  }
                  className="tp-focus flex cursor-pointer items-center gap-2 text-left text-sm"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      item.done ? 'border-brand bg-brand text-white' : 'tp-border',
                    )}
                  >
                    {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className={cn(item.done && 'tp-muted line-through')}>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="tp-surface p-5">
        <h3 className="text-sm font-semibold">{t.featuresExtra.detailNotes}</h3>
        <div className="mt-3">
          {task.content?.trim() ? (
            <TaskNotes content={task.content} />
          ) : (
            <p className="tp-muted text-sm">{t.featuresExtra.detailNoNotes}</p>
          )}
        </div>
      </section>
    </div>
  );
}
