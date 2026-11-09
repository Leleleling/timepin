import type { Importance, Task } from '../db/models';

export interface TaskDraft {
  title: string;
  content: string;
  dueDate: string; // YYYY-MM-DD，空表示不设截止
  dueTime: string; // HH:mm，空表示当天 23:59:59.999
  importance: Importance;
  tags: string[];
  pinned: boolean;
  subtasks: { id: string; title: string; done: boolean }[];
}

export type DraftError = 'titleRequired' | 'dueBeforeStart' | 'invalidDate';

export type DraftValidation =
  | { ok: true; dueAt: number | null }
  | { ok: false; error: DraftError };

export interface TaskPrefillInput {
  title?: string;
  due?: number | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyDraft(): TaskDraft {
  return {
    title: '',
    content: '',
    dueDate: '',
    dueTime: '',
    importance: 2,
    tags: [],
    pinned: false,
    subtasks: [],
  };
}

/** 从快捷链接参数生成草稿，非法或缺失的时间戳一律忽略。 */
export function draftFromPrefill(prefill?: TaskPrefillInput | null): TaskDraft {
  const draft = emptyDraft();
  draft.title = prefill?.title ?? '';
  if (typeof prefill?.due === 'number' && Number.isFinite(prefill.due)) {
    const date = new Date(prefill.due);
    if (Number.isFinite(date.getTime())) {
      draft.dueDate = formatDateInput(date);
      draft.dueTime = formatTimeInput(date);
    }
  }
  return draft;
}

/** 编辑态回填：保留标签与子任务，避免保存时丢失。 */
export function draftFromTask(task: Task): TaskDraft {
  const due =
    typeof task.dueAt === 'number' && Number.isFinite(task.dueAt)
      ? new Date(task.dueAt)
      : null;
  return {
    title: task.title,
    content: task.content ?? '',
    dueDate: due ? formatDateInput(due) : '',
    dueTime: due ? formatTimeInput(due) : '',
    importance: task.importance,
    tags: [...task.tags],
    pinned: task.pinned,
    subtasks: task.subtasks.map((item) => ({ ...item })),
  };
}

/**
 * 把日期／时刻字符串转成本地时区时间戳。
 * 只给日期时按当天 23:59:59.999 处理；给了时刻则以该时刻为准。
 * 返回 'invalid' 表示无法解析（含 2026-02-30 这类被 Date 自动进位的非法日期）。
 */
export function parseDueTimestamp(draft: TaskDraft): number | null | 'invalid' {
  if (!draft.dueDate) return draft.dueTime ? 'invalid' : null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.dueDate);
  if (!dateMatch) return 'invalid';

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  let hours = 23;
  let minutes = 59;
  let seconds = 59;
  let milliseconds = 999;

  if (draft.dueTime) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(draft.dueTime);
    if (!timeMatch) return 'invalid';
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
    seconds = 0;
    milliseconds = 0;
    if (hours > 23 || minutes > 59) return 'invalid';
  }

  const timestamp = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds).getTime();
  if (!Number.isFinite(timestamp)) return 'invalid';

  const check = new Date(timestamp);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return 'invalid';
  }
  return timestamp;
}

/** startAt 为新建时的当前时间，编辑时传原任务的 startAt，避免过期任务无法保存。 */
export function validateDraft(draft: TaskDraft, startAt: number): DraftValidation {
  if (!draft.title.trim()) return { ok: false, error: 'titleRequired' };
  const dueAt = parseDueTimestamp(draft);
  if (dueAt === 'invalid') return { ok: false, error: 'invalidDate' };
  if (dueAt !== null && dueAt < startAt) return { ok: false, error: 'dueBeforeStart' };
  return { ok: true, dueAt };
}

/** 组装写入 Dexie 的完整任务对象；编辑态保留 id、startAt、createdAt 与状态。 */
export function buildTask(
  draft: TaskDraft,
  urgencyScore: number,
  now: number,
  existing?: Task,
): Task {
  const parsed = parseDueTimestamp(draft);
  const content = draft.content.trim();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: draft.title.trim(),
    content: content || undefined,
    startAt: existing?.startAt ?? now,
    dueAt: parsed === 'invalid' ? null : parsed,
    importance: draft.importance,
    urgencyScore,
    status: existing?.status ?? 'todo',
    pinned: draft.pinned,
    tags: draft.tags.filter((tag) => tag.trim().length > 0),
    subtasks: draft.subtasks.filter((item) => item.title.trim().length > 0),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    // 编辑保存时保留看板的人工归类，避免整对象覆盖把它抹掉。
    ...(existing?.boardQuadrant ? { boardQuadrant: existing.boardQuadrant } : {}),
  };
}
