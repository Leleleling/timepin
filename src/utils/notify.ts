import type { Task } from '../db/models';

/** 提前量选项（分钟）：到点、15 分钟、1 小时、1 天。 */
export const LEAD_MINUTES = [0, 15, 60, 1440] as const;
export type LeadMinutes = (typeof LEAD_MINUTES)[number];
export const SEEN_LIMIT = 200;
export const MINUTE_MS = 60_000;
/** 过期超过该时长的任务不再提醒，避免首次开启时把历史逾期任务一次性全弹出来。 */
export const OVERDUE_GRACE_MS = 60 * MINUTE_MS;
/** 单次检查最多弹出的系统通知条数，命中过多的任务留到后续检查再补。 */
export const MAX_NOTIFICATIONS_PER_CHECK = 3;
/** 去重键最长保留 30 天，避免 seenKeys 无限累积（U28）。 */
export const SEEN_TTL_MS = 30 * 24 * 60 * MINUTE_MS;

export interface QuietHours {
  /** 本地小时 0–23；起止相同表示不启用。 */
  start: number;
  end: number;
}

export interface NotifyPreferences {
  enabled: boolean;
  leadMinutes: number;
  seenKeys: string[];
  /** 免打扰时段；缺省表示不启用（U27）。 */
  quietHours?: QuietHours;
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
    ? pruneSeenKeys(
        trimSeenKeys(record.seenKeys.filter((key): key is string => typeof key === 'string')),
      )
    : [];
  const rawQuiet = record.quietHours;
  let quietHours: QuietHours | undefined;
  if (typeof rawQuiet === 'object' && rawQuiet !== null) {
    const quiet = rawQuiet as Record<string, unknown>;
    const start = Number(quiet.start);
    const end = Number(quiet.end);
    if (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      start <= 23 &&
      end >= 0 &&
      end <= 23 &&
      start !== end
    ) {
      quietHours = { start, end };
    }
  }
  return {
    enabled: record.enabled === true,
    leadMinutes: isLeadMinutes(record.leadMinutes)
      ? record.leadMinutes
      : DEFAULT_NOTIFY_PREFERENCES.leadMinutes,
    seenKeys,
    ...(quietHours ? { quietHours } : {}),
  };
}

/** 支持跨午夜的免打扰区间；起止相同视为未启用。 */
export function isQuietHour(now: number, quiet?: QuietHours): boolean {
  if (!quiet || quiet.start === quiet.end) return false;
  const hour = new Date(now).getHours();
  return quiet.start < quiet.end
    ? hour >= quiet.start && hour < quiet.end
    : hour >= quiet.start || hour < quiet.end;
}

/**
 * U28：seenKeys 形如 `id:dueAt:leadMinutes`，按第二段时间戳淘汰过期记录。
 * 旧格式或异常键保留，由 trimSeenKeys 兜住总量，避免误删有效状态。
 */
export function pruneSeenKeys(
  keys: string[],
  now: number = Date.now(),
  maxAgeMs: number = SEEN_TTL_MS,
): string[] {
  return keys.filter((key) => {
    const due = Number(key.split(':')[1]);
    if (!Number.isFinite(due) || due <= 0) return true;
    return now - due <= maxAgeMs;
  });
}

/** 去重键带上截止时间：任务被延后或改期后可以再次提醒。 */
export function notificationKey(task: Task): string {
  const due = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt) ? task.dueAt : 'none';
  return `${task.id}:${due}`;
}

/** 持久化用的去重键额外带上提前量：用户调整提前量后可以重新收到提醒（U28）。 */
export function notifySeenKey(task: Task, leadMinutes: number): string {
  return `${notificationKey(task)}:${leadMinutes}`;
}

export function trimSeenKeys(keys: string[], limit: number = SEEN_LIMIT): string[] {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  if (safeLimit === 0) return [];
  return keys.length > safeLimit ? keys.slice(keys.length - safeLimit) : [...keys];
}

/**
 * 只提醒未完成的、有截止时间的、落在 [now - 逾期宽限, now + 提前量] 窗口内且没提醒过的任务。
 * 下界很关键：没有它时任意久之前过期的任务都会命中，首次开启提醒会形成通知风暴（M3）。
 */
export function shouldNotify(
  task: Task,
  now: number,
  leadMinutes: number,
  seen: Set<string>,
): boolean {
  if (task.status !== 'todo') return false;
  if (typeof task.dueAt !== 'number' || !Number.isFinite(task.dueAt)) return false;
  // 同时兼容旧版持久化下来的「id:due」键与新版带提前量的键。
  if (seen.has(notificationKey(task)) || seen.has(notifySeenKey(task, leadMinutes))) return false;
  if (now - task.dueAt > OVERDUE_GRACE_MS) return false;
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
