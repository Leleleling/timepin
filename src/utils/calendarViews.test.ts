import { describe, expect, it } from 'vitest';
import type { Task } from '../db/models';
import {
  buildDaySlots,
  buildWeekDays,
  buildYearMonths,
  countTasksInKeys,
  dateKeysOfRange,
  startOfWeek,
} from './calendarViews';

function stub(): Task {
  return {
    id: 'x',
    title: '任务',
    startAt: 0,
    dueAt: null,
    importance: 2,
    urgencyScore: 3,
    status: 'todo',
    pinned: false,
    tags: [],
    subtasks: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('buildYearMonths', () => {
  it('生成 12 个月且闰年二月为 29 天', () => {
    const months = buildYearMonths(2024);
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe(0);
    expect(months[11].month).toBe(11);
    expect(months[1].keys).toHaveLength(29);
    expect(months[1].keys[0]).toBe('2024-02-01');
    expect(months[1].keys[28]).toBe('2024-02-29');
    expect(months.every((item) => item.cells.length % 7 === 0)).toBe(true);
  });

  it('平年二月为 28 天，跨年不影响月份键', () => {
    expect(buildYearMonths(2026)[1].keys).toHaveLength(28);
    expect(buildYearMonths(2026)[0].keys[0]).toBe('2026-01-01');
  });
});

describe('startOfWeek / buildWeekDays', () => {
  it('以周一为首列且不修改入参', () => {
    const wednesday = new Date(2026, 10, 11);
    const monday = startOfWeek(wednesday);
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(10);
    expect(monday.getDate()).toBe(9);
    expect(wednesday.getDate()).toBe(11);
  });

  it('一周七天并能跨月', () => {
    const week = buildWeekDays(new Date(2026, 11, 1));
    expect(week).toHaveLength(7);
    expect(week[0].key).toBe('2026-11-30');
    expect(week[6].key).toBe('2026-12-06');
    expect(week[1].key).toBe('2026-12-01');
  });
});

describe('buildDaySlots', () => {
  it('生成 24 个小时刻度', () => {
    const slots = buildDaySlots();
    expect(slots).toHaveLength(24);
    expect(slots[0]).toEqual({ hour: 0, label: '00:00' });
    expect(slots[23]).toEqual({ hour: 23, label: '23:00' });
  });
});

describe('dateKeysOfRange / countTasksInKeys', () => {
  it('范围含首尾且可跨月', () => {
    const keys = dateKeysOfRange(new Date(2026, 10, 30), new Date(2026, 11, 2));
    expect(keys).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
  });

  it('起止颠倒时返回空数组', () => {
    expect(dateKeysOfRange(new Date(2026, 11, 2), new Date(2026, 10, 30))).toEqual([]);
  });

  it('只累加区间内分组的任务数', () => {
    const groups = new Map([
      ['2026-11-30', [stub(), stub()]],
      ['2026-12-01', [stub()]],
      ['2026-12-09', [stub()]],
    ]);
    expect(countTasksInKeys(groups, ['2026-11-30', '2026-12-01'])).toBe(3);
    expect(countTasksInKeys(new Map(), ['2026-11-30'])).toBe(0);
  });
});
