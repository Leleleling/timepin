import type { Task } from '../db/models';

/** 提前量选项（分钟）：到点、15 分钟、1 小时、1 天。 */
export const LEAD_MINUTES = [0, 15, 60, 1440] as const;
export type LeadMinutes = (typeof LEAD_MINUTES)[number];
export const SEEN_LIMIT = 200;
export const MINUTE_MS = 60_000;

export interface NotifyPreferences {
  enabled: boolean;
  leadMinutes: number;
  seenKeys: string[];
}

export const DEFAULT_NOTIFY_PREFERENCES: NotifyPreferences = {
  enabled: false,
  leadMinutes: 60,
  seenKeys: [],
};

export function isLeadMinutes(value: unknown): value is LeadMinutes {
  return typeof value === 'number' && LEAD_MINUTES.includes(value as LeadMinutes);
}

/** 从 localStorage 读到的结构一律先净化，避免脏数据让提醒逻辑抛错。 */
export function sanitizePreferences(value: unknown): NotifyPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFY_PREFERENCES };
  }
  const record = value as Record<string, unknown>;
  const seenKeys = Array.isArray(record.seenKeys)
    ? trimSeenKeys(record.seenKeys.filter((key): key is string => typeof key === 'string'))
    : [];
  return {
    enabled: record.enabled === true,
    leadMinutes: isLeadMinutes(record.leadMinutes)
      ? record.leadMinutes
      : DEFAULT_NOTIFY_PREFERENCES.leadMinutes,
    seenKeys,
  };
}

/** 去重键带上截止时间：任务被延后或改期后可以再次提醒。 */
export function notificationKey(task: Task): string {
  const due = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt) ? task.dueAt : 'none';
  return `${task.id}:${due}`;
}

export function trimSeenKeys(keys: string[], limit: number = SEEN_LIMIT): string[] {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  if (safeLimit === 0) return [];
  return keys.length > safeLimit ? keys.slice(keys.length - safeLimit) : [...keys];
}

/** 只提醒未完成的、有截止时间的、进入提前量窗口且没提醒过的任务；已过期也算命中。 */
export function shouldNotify(
  task: Task,
  now: number,
  leadMinutes: number,
  seen: Set<string>,
): boolean {
  if (task.status !== 'todo') return false;
  if (typeof task.dueAt !== 'number' || !Number.isFinite(task.dueAt)) return false;
  if (seen.has(notificationKey(task))) return false;
  const window = Math.max(0, leadMinutes) * MINUTE_MS;
  return task.dueAt - now <= window;
}

export function collectDueTasks(
  tasks: Task[],
  now: number,
  leadMinutes: number,
  seen: Set<string>,
): Task[] {
  return tasks.filter((task) => shouldNotify(task, now, leadMinutes, seen));
}
