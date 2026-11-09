import { useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import type { Importance } from '../../db/models';
import { useDict } from '../../utils/i18n';
import type { DraftError, TaskDraft } from '../../utils/taskForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { cn } from '../ui/cn';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 把 Date 转成 input[type=date] 需要的本地时区 YYYY-MM-DD。 */
function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface TaskFormFieldsProps {
  draft: TaskDraft;
  onChange: (patch: Partial<TaskDraft>) => void;
  error: DraftError | null;
  urgencyPreview: number | null;
  showPrefillHint: boolean;
  saveFailed: boolean;
}

/** 表单字段区，与保存逻辑解耦，保证单个文件保持精简。 */
export function TaskFormFields({
  draft,
  onChange,
  error,
  urgencyPreview,
  showPrefillHint,
  saveFailed,
}: TaskFormFieldsProps) {
  const t = useDict();
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  const levels: { value: Importance; label: string; color: string }[] = [
    { value: 3, label: t.task.importance.high, color: 'bg-brand' },
    { value: 2, label: t.task.importance.medium, color: 'bg-sun' },
    { value: 1, label: t.task.importance.low, color: 'bg-muted' },
  ];

  const quickDates: { key: string; label: string; date: string }[] = [
    { key: 'today', label: t.form.dueToday, date: toDateInput(new Date()) },
    { key: 'tomorrow', label: t.form.dueTomorrow, date: toDateInput(new Date(Date.now() + DAY_MS)) },
    { key: 'in3', label: t.form.dueIn3Days, date: toDateInput(new Date(Date.now() + 3 * DAY_MS)) },
    { key: 'in7', label: t.form.dueIn1Week, date: toDateInput(new Date(Date.now() + 7 * DAY_MS)) },
  ];

  const errorMessage =
    error === 'titleRequired'
      ? t.form.errorTitleRequired
      : error === 'dueBeforeStart'
        ? t.form.errorDueBeforeStart
        : error === 'invalidDate'
          ? t.form.errorInvalidDate
          : null;

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || draft.tags.includes(value)) return;
    onChange({ tags: [...draft.tags, value] });
    setTagInput('');
  };

  const addSubtask = () => {
    const value = subtaskInput.trim();
    if (!value) return;
    onChange({
      subtasks: [
        ...draft.subtasks,
        { id: crypto.randomUUID(), title: value, done: false },
      ],
    });
    setSubtaskInput('');
  };

  return (
    <div className="space-y-5">
      {showPrefillHint ? (
        <p className="tp-pill bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep">
          {t.form.urlPrefillHint}
        </p>
      ) : null}

      <div>
        <Input
          autoFocus
          variant="plain"
          value={draft.title}
          placeholder={t.form.titlePlaceholder}
          aria-label={t.form.titlePlaceholder}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <div className="tp-divider mt-2" />
      </div>

      <div>
        <p className="tp-label mb-2">{t.form.contentLabel}</p>
        <Textarea
          value={draft.content}
          placeholder={t.form.contentPlaceholder}
          aria-label={t.form.contentLabel}
          onChange={(event) => onChange({ content: event.target.value })}
        />
      </div>

      <div>
        <p className="tp-label mb-2">{t.form.dueLabel}</p>
        <div className="flex flex-wrap gap-2">
          {quickDates.map((option) => {
            const active = draft.dueDate === option.date;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ dueDate: option.date })}
                className={cn(
                  'tp-focus tp-pill cursor-pointer border transition-all duration-200',
                  active
                    ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-brand-deep'
                    : 'tp-border tp-muted hover:border-brand/40 hover:text-brand',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="tp-label mb-2">{t.form.dueCustom}</p>
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })}
            />
          </div>
          <div>
            <p className="tp-label mb-2">{t.form.timeLabel}</p>
            <Input
              type="time"
              value={draft.dueTime}
              disabled={!draft.dueDate}
              onChange={(event) => onChange({ dueTime: event.target.value })}
            />
          </div>
        </div>
        {draft.dueDate ? (
          <button
            type="button"
            onClick={() => onChange({ dueDate: '', dueTime: '' })}
            className="tp-focus tp-muted mt-2 cursor-pointer text-xs underline decoration-dotted underline-offset-4 hover:text-brand"
          >
            {t.form.dueNone}
          </button>
        ) : null}
      </div>

      <div>
        <p className="tp-label mb-2">{t.form.importanceLabel}</p>
        <div className="flex gap-2">
          {levels.map((level) => (
            <button
              key={level.value}
              type="button"
              aria-pressed={draft.importance === level.value}
              onClick={() => onChange({ importance: level.value })}
              className={cn(
                'tp-focus tp-pill flex-1 cursor-pointer justify-center border py-2 transition-all duration-200',
                draft.importance === level.value
                  ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-brand-deep'
                  : 'tp-border tp-muted hover:border-brand/40 hover:text-brand',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', level.color)} />
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="tp-label mb-2">{t.form.tagsLabel}</p>
        {draft.tags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {draft.tags.map((tag) => (
              <span key={tag} className="tp-pill tp-border border py-1">
                {tag}
                <button
                  type="button"
                  aria-label={`${t.action.remove} ${tag}`}
                  onClick={() => onChange({ tags: draft.tags.filter((item) => item !== tag) })}
                  className="tp-focus cursor-pointer rounded-full hover:text-brand"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <Input
          value={tagInput}
          placeholder={t.form.tagsPlaceholder}
          aria-label={t.form.tagsLabel}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
        />
      </div>

      <div>
        <p className="tp-label mb-2">{t.form.subtasksLabel}</p>
        {draft.subtasks.map((item) => (
          <div key={item.id} className="mb-1.5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.done}
              aria-label={item.title}
              onChange={() =>
                onChange({
                  subtasks: draft.subtasks.map((entry) =>
                    entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                  ),
                })
              }
              className="h-4 w-4 cursor-pointer accent-[var(--tp-brand-hex)]"
            />
            <span className={cn('flex-1 text-sm', item.done && 'line-through opacity-55')}>
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t.action.remove}
              onClick={() =>
                onChange({ subtasks: draft.subtasks.filter((entry) => entry.id !== item.id) })
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={subtaskInput}
            placeholder={t.form.subtasksPlaceholder}
            aria-label={t.form.subtasksLabel}
            onChange={(event) => setSubtaskInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSubtask();
              }
            }}
          />
          <Button variant="soft" size="icon" className="h-11 w-11 shrink-0" onClick={addSubtask} aria-label={t.form.subtaskAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="tp-label">{t.form.pinnedLabel}</p>
          <button
            type="button"
            aria-pressed={draft.pinned}
            onClick={() => onChange({ pinned: !draft.pinned })}
            className={cn(
              'tp-focus tp-pill cursor-pointer border py-1 transition-all duration-200',
              draft.pinned
                ? 'border-brand bg-brand/10 text-brand'
                : 'tp-border tp-muted hover:border-brand/40 hover:text-brand',
            )}
          >
            {draft.pinned ? t.action.unpin : t.form.pinnedLabel}
          </button>
        </div>
        <p className="tp-muted text-xs">{t.form.pinnedHint}</p>
      </div>

      {urgencyPreview !== null ? (
        <div className="tp-surface flex items-center gap-2 p-3">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="tp-label">{t.form.urgencyPreview}</span>
          <span className="ml-auto text-lg font-bold text-brand">
            {urgencyPreview.toFixed(1)}
          </span>
        </div>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-brand">
          {errorMessage}
        </p>
      ) : null}
      {saveFailed ? (
        <p role="alert" className="text-sm font-medium text-brand">
          {t.feedback.saveError}
        </p>
      ) : null}
    </div>
  );
}
