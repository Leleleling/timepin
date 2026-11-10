import type { Importance, RecurrenceRule, Task } from '../db/models';

export interface TaskDraft {
  title: string;
  content: string;
  dueDate: string; // YYYY-MM-DD，空表示不设截止
  dueTime: string; // HH:mm，空表示当天 23:59:59.999
  importance: Importance;
  tags: string[];
  pinned: boolean;
  subtasks: { id: string; title: string; done: boolean }[];
  /** 可选，缺省表示不重复；保持可选以免破坏既有草稿夹具。 */
  recurrence?: RecurrenceRule;
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

/** 按本地日历日推进 N 天：用 setDate 而非 +24h，夏令时切换日也能保持同一时刻。 */
export function addCalendarDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** 「只给日期」的默认截止时刻，用于回填时区分用户是否显式设过时刻（S2）。 */
function isEndOfDay(date: Date): boolean {
  return (
    date.getHours() === 23 &&
    date.getMinutes() === 59 &&
    date.getSeconds() === 59 &&
    date.getMilliseconds() === 999
  );
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
    // 只给日期时回填为空，保存后仍是 23:59:59.999，dueAt 往返稳定（S2）。
    dueTime: due && !isEndOfDay(due) ? formatTimeInput(due) : '',
    importance: task.importance,
    tags: [...task.tags],
    pinned: task.pinned,
    subtasks: task.subtasks.map((item) => ({ ...item })),
    recurrence: task.recurrence,
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
    // 编辑保存时保留所有可选增强字段，避免整对象覆盖把它们抹掉。
    ...(existing?.boardQuadrant ? { boardQuadrant: existing.boardQuadrant } : {}),
    ...(existing?.manualOrder !== undefined
      ? { manualOrder: existing.manualOrder }
      : {}),
    ...(existing?.preTrashStatus ? { preTrashStatus: existing.preTrashStatus } : {}),
    ...(existing?.lastNotifiedAt !== undefined
      ? { lastNotifiedAt: existing.lastNotifiedAt }
      : {}),
    ...(draft.recurrence ? { recurrence: draft.recurrence } : {}),
  };
}
