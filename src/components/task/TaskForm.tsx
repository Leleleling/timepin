import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useTasks } from '../../hooks/useTasks';
import type { Task, UrgencyProfile } from '../../db/models';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { useDict } from '../../utils/i18n';
import { calculateUrgency } from '../../utils/urgency';
import {
  buildTask,
  draftFromPrefill,
  draftFromTask,
  parseDueTimestamp,
  validateDraft,
  type DraftError,
  type TaskDraft,
} from '../../utils/taskForm';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TaskFormFields } from './TaskFormFields';

interface TaskFormBodyProps {
  initialDraft: TaskDraft;
  existing?: Task;
  showPrefillHint: boolean;
  profile: UrgencyProfile;
  onClose: () => void;
  onCreate: (task: Task) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Task>) => Promise<void>;
}

/** 每次打开表单都会重新挂载，草稿与内部输入状态天然干净。 */
function TaskFormBody({
  initialDraft,
  existing,
  showPrefillHint,
  profile,
  onClose,
  onCreate,
  onUpdate,
}: TaskFormBodyProps) {
  const t = useDict();
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [error, setError] = useState<DraftError | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = parseDueTimestamp(draft);
  const urgencyPreview = parsed === 'invalid' ? null : calculateUrgency(parsed, profile);

  const handleChange = (patch: Partial<TaskDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    setError(null);
    setSaveFailed(false);
  };

  const handleSave = () => {
    if (saving) return;
    const now = Date.now();
    const result = validateDraft(draft, existing?.startAt ?? now);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setSaveFailed(false);
    setSaving(true);
    const task = buildTask(draft, calculateUrgency(result.dueAt, profile), now, existing);
    const action = existing ? onUpdate(existing.id, task) : onCreate(task);

    void action
      .then(onClose)
      .catch((saveError: unknown) => {
        console.error('[timepin] Unable to save task', saveError);
        setSaving(false);
        setSaveFailed(true);
      });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? t.form.titleEdit : t.form.titleNew}
      subtitle={existing ? t.form.subtitleEdit : t.form.subtitleNew}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.action.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t.form.saving : t.action.save}
          </Button>
        </>
      }
    >
      <TaskFormFields
        draft={draft}
        onChange={handleChange}
        error={error}
        urgencyPreview={urgencyPreview}
        showPrefillHint={showPrefillHint}
        saveFailed={saveFailed}
      />
    </Modal>
  );
}

/** 全局唯一的任务表单：新建、编辑与快捷链接预填共用同一入口。 */
export function TaskForm() {
  const t = useDict();
  const pushToast = useToastStore((state) => state.push);
  const isOpen = useAppStore((state) => state.isTaskModalOpen);
  const editingTaskId = useAppStore((state) => state.editingTaskId);
  const prefill = useAppStore((state) => state.prefill);
  const closeTaskModal = useAppStore((state) => state.closeTaskModal);
  const { tasks, profile, createTask, updateTask } = useTasks();

  // 单独查目标是否存在：加载中为 undefined，只有确认为 false 才判定「目标已丢失」，
  // 避免 useLiveQuery 首帧空数组把正常编辑误关掉（S4）。
  const targetExists = useLiveQuery(
    () =>
      editingTaskId
        ? db.tasks
            .get(editingTaskId)
            .then((found) => Boolean(found))
            .catch(() => false)
        : Promise.resolve(true),
    [editingTaskId],
    undefined,
  );
  const missingTarget = isOpen && Boolean(editingTaskId) && targetExists === false;

  useEffect(() => {
    if (!missingTarget) return;
    pushToast({ message: t.feedback.loadError, tone: 'error' });
    closeTaskModal();
  }, [missingTarget, pushToast, t.feedback.loadError, closeTaskModal]);

  const existing = editingTaskId
    ? tasks.find((task) => task.id === editingTaskId)
    : undefined;

  // 编辑态在目标对象尚未进入 liveQuery 结果前不渲染，避免闪一个「新建任务」表单。
  if (!isOpen || missingTarget || (editingTaskId && !existing)) return null;
  const showPrefillHint = !existing && Boolean(prefill?.title || prefill?.due);
  // 编辑对象或预填内容变化时重挂载，草稿随之重置（S5）。
  const formKey = `${editingTaskId ?? 'new'}:${prefill?.title ?? ''}:${prefill?.due ?? ''}`;

  return (
    <TaskFormBody
      key={formKey}
      initialDraft={existing ? draftFromTask(existing) : draftFromPrefill(prefill)}
      existing={existing}
      showPrefillHint={showPrefillHint}
      profile={profile}
      onClose={closeTaskModal}
      onCreate={createTask}
      onUpdate={updateTask}
    />
  );
}
