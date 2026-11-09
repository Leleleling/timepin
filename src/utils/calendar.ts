import type { AppSettings, Importance, Task } from '../db/models';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 本地时区的日期键 YYYY-MM-DD，month 为 0-based（与 Date.getMonth 一致）。 */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function dateKeyOf(timestamp: number): string {
  const date = new Date(timestamp);
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 以周一为首列生成当月网格；首尾空位用 null 补齐整周。 */
export function buildMonthCells(year: number, month: number): (number | null)[] {
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

/** 任务落在哪一天：优先截止时间，无截止时间时用创建时间。 */
export function anchorTimestamp(task: Task): number | null {
  if (typeof task.dueAt === 'number' && Number.isFinite(task.dueAt)) return task.dueAt;
  if (Number.isFinite(task.startAt)) return task.startAt;
  return null;
}

/** 单次遍历把有效任务按日期分组，排除回收站与归档。 */
export function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (task.status === 'trash' || task.status === 'archived') return;
    const anchor = anchorTimestamp(task);
    if (anchor === null) return;
    const key = dateKeyOf(anchor);
    const bucket = groups.get(key);
    if (bucket) bucket.push(task);
    else groups.set(key, [task]);
  });
  return groups;
}

export function colorForImportance(
  importance: Importance,
  colorMap: AppSettings['colorMap'],
): string {
  if (importance === 3) return colorMap.high;
  if (importance === 2) return colorMap.medium;
  return colorMap.low;
}

export interface ColorBar {
  taskId: string;
  color: string;
  importance: Importance;
}

/** 每天最多三条色带，按重要度降序取最重要的任务。 */
export function barsForDay(
  tasks: Task[],
  colorMap: AppSettings['colorMap'],
): ColorBar[] {
  return [...tasks]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map((task) => ({
      taskId: task.id,
      color: colorForImportance(task.importance, colorMap),
      importance: task.importance,
    }));
}
