import { useMemo, useState } from 'react';
import { ArrowLeft, GitMerge, Pencil, Trash2, Tag as TagIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useTasks, type TaskPatch } from '../hooks/useTasks';
import { useAppStore } from '../store/useAppStore';
import { interpolate, useDict } from '../utils/i18n';

type TagAction = { kind: 'rename' | 'merge' | 'delete'; tag: string } | null;

/** U17：标签管理页，重命名 / 合并 / 删除，并可点选标签直接回首页筛选。 */
export default function Tags() {
  const t = useDict();
  const navigate = useNavigate();
  const { tasks, bulkUpdate } = useTasks();
  const setTagFilter = useAppStore((state) => state.setTagFilter);
  const [action, setAction] = useState<TagAction>(null);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task) =>
      task.tags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1)),
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [tasks]);

  const otherTags = action
    ? counts.map(([tag]) => tag).filter((tag) => tag !== action.tag)
    : [];

  const openAction = (kind: 'rename' | 'merge' | 'delete', tag: string) => {
    setValue(kind === 'merge' ? (otherTags[0] ?? '') : kind === 'rename' ? tag : '');
    setAction({ kind, tag });
    setFeedback(null);
  };

  const applyAction = () => {
    if (!action) return;
    const target = value.trim();
    if ((action.kind === 'rename' || action.kind === 'merge') && !target) return;

    const patches: TaskPatch[] = [];
    tasks
      .filter((task) => task.tags.includes(action.tag))
      .forEach((task) => {
        const tags =
          action.kind === 'delete'
            ? task.tags.filter((tag) => tag !== action.tag)
            : Array.from(
                new Set(task.tags.map((tag) => (tag === action.tag ? target : tag))),
              );
        patches.push({ id: task.id, patch: { tags } });
      });

    if (patches.length > 0) {
      void bulkUpdate(patches)
        .then(() => setFeedback(t.feedback.saved))
        .catch((error: unknown) =>
          console.error('[timepin] Unable to update tags', error),
        );
    }
    setAction(null);
  };

  const filterBy = (tag: string) => {
    setTagFilter(tag);
    navigate('/');
  };

  return (
    <div className="tp-rise space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
          {t.featuresExtra.detailBack}
        </Button>
        <h2 className="text-base font-semibold">{t.featuresExtra.tagsTitle}</h2>
      </div>

      {feedback ? (
        <p role="status" className="text-xs font-medium text-success">
          {feedback}
        </p>
      ) : null}

      {counts.length === 0 ? (
        <section className="tp-surface p-8 text-center">
          <TagIcon className="mx-auto h-8 w-8 tp-muted" />
          <p className="tp-muted mt-3 text-sm">{t.featuresExtra.tagsEmpty}</p>
        </section>
      ) : (
        <div className="space-y-2">
          {counts.map(([tag, count]) => (
            <section key={tag} className="tp-surface flex flex-wrap items-center gap-2 p-4">
              <button
                type="button"
                onClick={() => filterBy(tag)}
                title={t.featuresExtra.tagsTitle}
                className="tp-focus min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold hover:text-brand"
              >
                #{tag}
              </button>
              <span className="tp-muted shrink-0 text-xs">
                {interpolate(t.featuresExtra.tagsCountTemplate, { count })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.featuresExtra.tagsRename} title={t.featuresExtra.tagsRename} onClick={() => openAction('rename', tag)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.featuresExtra.tagsMerge} title={t.featuresExtra.tagsMerge} onClick={() => openAction('merge', tag)}>
                <GitMerge className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-brand" aria-label={t.featuresExtra.tagsDelete} title={t.featuresExtra.tagsDelete} onClick={() => openAction('delete', tag)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={
          action?.kind === 'rename'
            ? t.featuresExtra.tagsRename
            : action?.kind === 'merge'
              ? t.featuresExtra.tagsMerge
              : t.featuresExtra.tagsDelete
        }
        subtitle={action?.tag}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>
              {t.action.cancel}
            </Button>
            <Button onClick={applyAction}>{t.action.confirm}</Button>
          </>
        }
      >
        {action?.kind === 'delete' ? (
          <p className="tp-muted text-sm">{action.tag}</p>
        ) : (
          <input
            type="text"
            value={value}
            autoFocus
            placeholder={t.featuresExtra.tagsValuePlaceholder}
            aria-label={t.featuresExtra.tagsValuePlaceholder}
            onChange={(event) => setValue(event.target.value)}
            className="tp-focus tp-border tp-surface h-11 w-full rounded-lg border px-3 text-sm"
          />
        )}
      </Modal>
    </div>
  );
}
