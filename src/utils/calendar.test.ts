import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, type Task } from '../db/models';
import {
  barsForDay,
  buildMonthCells,
  dateKey,
  dateKeyOf,
  groupTasksByDate,
} from './calendar';

const NOW = new Date('2026-11-09T10:00:00').getTime();

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    startAt: NOW,
    dueAt: null,
    importance: 2,
    urgencyScore: 2,
    status: 'todo',
    pinned: false,
    tags: [],
    subtasks: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe('buildMonthCells', () => {
  it('2026 年 11 月从周日开始，补齐六周', () => {
    const cells = buildMonthCells(2026, 10);
    expect(cells).toHaveLength(42);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]).toBe(1);
    expect(cells[35]).toBe(30);
    expect(cells[36]).toBeNull();
  });

  it('闰年二月有 29 天', () => {
    const cells = buildMonthCells(2024, 1);
    expect(cells.filter((day) => day !== null)).toHaveLength(29);
    expect(cells).toContain(29);
  });

  it('平年二月有 28 天', () => {
    expect(buildMonthCells(2026, 1).filter((day) => day !== null)).toHaveLength(28);
  });

  it('长度始终是 7 的倍数', () => {
    for (let month = 0; month < 12; month += 1) {
      expect(buildMonthCells(2026, month).length % 7).toBe(0);
    }
  });
});

describe('日期键与分组', () => {
  it('月份补零且与时间戳一致', () => {
    expect(dateKey(2026, 10, 9)).toBe('2026-11-09');
    expect(dateKeyOf(NOW)).toBe('2026-11-09');
    expect(dateKey(2026, 0, 5)).toBe('2026-01-05');
  });

  it('按截止时间分组，无截止时间用创建时间', () => {
    const due = new Date('2026-11-12T09:00:00').getTime();
    const groups = groupTasksByDate([
      task('a', { dueAt: due }),
      task('b', { dueAt: null, startAt: NOW }),
      task('c', { dueAt: due }),
    ]);
    expect(groups.get('2026-11-12')?.map((item) => item.id)).toEqual(['a', 'c']);
    expect(groups.get('2026-11-09')?.map((item) => item.id)).toEqual(['b']);
  });

  it('回收站与归档任务不出现在日历里', () => {
    const groups = groupTasksByDate([
      task('trash', { status: 'trash' }),
      task('archived', { status: 'archived' }),
    ]);
    expect(groups.size).toBe(0);
  });
});

describe('barsForDay', () => {
  it('最多三条并按重要度降序', () => {
    const bars = barsForDay(
      [
        task('low', { importance: 1 }),
        task('high', { importance: 3 }),
        task('mid', { importance: 2 }),
        task('high2', { importance: 3 }),
      ],
      DEFAULT_APP_SETTINGS.colorMap,
    );
    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => bar.importance)).toEqual([3, 3, 2]);
    expect(bars[0].color).toBe(DEFAULT_APP_SETTINGS.colorMap.high);
  });

  it('空任务不产生色条', () => {
    expect(barsForDay([], DEFAULT_APP_SETTINGS.colorMap)).toEqual([]);
  });
});
