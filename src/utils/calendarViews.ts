import type { Task } from '../db/models';
import { buildMonthCells, dateKey } from './calendar';

export interface YearMonth {
  month: number; // 0-based
  cells: (number | null)[];
  keys: string[];
}

export interface WeekDay {
  key: string;
  date: Date;
}

export interface DaySlot {
  hour: number;
  label: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 周一为首列，返回所在周的周一零点（不修改入参）。 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

export function buildYearMonths(year: number): YearMonth[] {
  return Array.from({ length: 12 }, (_, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      month,
      cells: buildMonthCells(year, month),
      keys: Array.from({ length: daysInMonth }, (_, index) => dateKey(year, month, index + 1)),
    };
  });
}

export function buildWeekDays(anchor: Date): WeekDay[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return { key: dateKey(date.getFullYear(), date.getMonth(), date.getDate()), date };
  });
}

export function buildDaySlots(): DaySlot[] {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${pad(hour)}:00` }));
}

/** 含首尾的日期键列表；上限 366 天，避免异常入参造成死循环。 */
export function dateKeysOfRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  while (cursor.getTime() <= last && keys.length < 366) {
    keys.push(dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/** 复用月视图的分组 Map，单次 O(天数) 求和，不为每个视图重算分组。 */
export function countTasksInKeys(groups: Map<string, Task[]>, keys: string[]): number {
  return keys.reduce((sum, key) => sum + (groups.get(key)?.length ?? 0), 0);
}
