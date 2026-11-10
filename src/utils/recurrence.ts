import type { RecurrenceRule, Task, UrgencyProfile } from '../db/models';
import { addCalendarDays } from './taskForm';
import { calculateUrgency } from './urgency';

export const RECURRENCE_RULES: RecurrenceRule[] = ['daily', 'weekly', 'monthly'];

export function isRecurrenceRule(value: unknown): value is RecurrenceRule {
  return typeof value === 'string' && RECURRENCE_RULES.includes(value as RecurrenceRule);
}

/** 按本地日历推进周期；月推进使用 setMonth 并夹紧到当月最后一天。 */
export function nextOccurrence(dueAt: number, rule: RecurrenceRule): number {
  if (rule === 'daily') return addCalendarDays(dueAt, 1);
  if (rule === 'weekly') return addCalendarDays(dueAt, 7);
  const date = new Date(dueAt);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.getTime();
}

/** 由已完成的任务派生下一次实例：全新 id、状态回到 todo、子任务重新未完成、紧急度重算。 */
export function createNextOccurrence(
  task: Task,
  profile: UrgencyProfile,
): Task | null {
  if (!task.recurrence || typeof task.dueAt !== 'number') return null;
  const dueAt = nextOccurrence(task.dueAt, task.recurrence);
  if (!Number.isFinite(dueAt) || dueAt <= task.dueAt) return null;
  const now = Date.now();
  return {
    ...task,
    id: crypto.randomUUID(),
    status: 'todo',
    dueAt,
    urgencyScore: calculateUrgency(dueAt, profile),
    subtasks: task.subtasks.map((item) => ({ ...item, done: false })),
    startAt: now,
    createdAt: now,
    updatedAt: now,
    preTrashStatus: undefined,
    boardQuadrant: undefined,
    manualOrder: undefined,
  };
}
