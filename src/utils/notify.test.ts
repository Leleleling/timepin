import { describe, expect, it } from 'vitest';
import type { Task } from '../db/models';
import {
  DEFAULT_NOTIFY_PREFERENCES,
  MINUTE_MS,
  collectDueTasks,
  notificationKey,
  sanitizePreferences,
  shouldNotify,
  trimSeenKeys,
} from './notify';

const NOW = 1_700_000_000_000;

function task(patch: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '回复合作方邮件',
    startAt: NOW - MINUTE_MS,
    dueAt: NOW + 30 * MINUTE_MS,
    importance: 2,
    urgencyScore: 4,
    status: 'todo',
    pinned: false,
    tags: [],
    subtasks: [],
    createdAt: NOW - MINUTE_MS,
    updatedAt: NOW - MINUTE_MS,
    ...patch,
  };
}

describe('shouldNotify', () => {
  it('只提醒进入提前量窗口的任务', () => {
    expect(shouldNotify(task(), NOW, 60, new Set())).toBe(true);
    expect(shouldNotify(task(), NOW, 15, new Set())).toBe(false);
    expect(shouldNotify(task(), NOW, 0, new Set())).toBe(false);
  });

  it('已过期任务在到点提醒模式下仍然命中', () => {
    expect(shouldNotify(task({ dueAt: NOW - MINUTE_MS }), NOW, 0, new Set())).toBe(true);
  });

  it('排除已完成、归档、回收站与无截止时间的任务', () => {
    expect(shouldNotify(task({ status: 'done' }), NOW, 60, new Set())).toBe(false);
    expect(shouldNotify(task({ status: 'archived' }), NOW, 60, new Set())).toBe(false);
    expect(shouldNotify(task({ status: 'trash' }), NOW, 60, new Set())).toBe(false);
    expect(shouldNotify(task({ dueAt: null }), NOW, 60, new Set())).toBe(false);
    expect(shouldNotify(task({ dueAt: undefined }), NOW, 60, new Set())).toBe(false);
  });

  it('已提醒过的任务不重复提醒', () => {
    const current = task();
    const seen = new Set([notificationKey(current)]);
    expect(shouldNotify(current, NOW, 60, seen)).toBe(false);
  });

  it('截止时间被改动后可以再次提醒', () => {
    const before = task();
    const after = task({ dueAt: NOW + 40 * MINUTE_MS });
    expect(notificationKey(before)).not.toBe(notificationKey(after));
    expect(shouldNotify(after, NOW, 60, new Set([notificationKey(before)]))).toBe(true);
  });

  it('collectDueTasks 一次性筛出所有命中项', () => {
    const hits = collectDueTasks(
      [task({ id: 'a' }), task({ id: 'b', status: 'done' }), task({ id: 'c', dueAt: null })],
      NOW,
      60,
      new Set(),
    );
    expect(hits.map((item) => item.id)).toEqual(['a']);
  });
});

describe('trimSeenKeys', () => {
  it('保留最近的若干条，且不修改入参', () => {
    const keys = ['a', 'b', 'c', 'd'];
    expect(trimSeenKeys(keys, 2)).toEqual(['c', 'd']);
    expect(keys).toEqual(['a', 'b', 'c', 'd']);
  });

  it('非法上限返回空数组', () => {
    expect(trimSeenKeys(['a'], 0)).toEqual([]);
    expect(trimSeenKeys(['a'], Number.NaN)).toEqual([]);
  });
});

describe('sanitizePreferences', () => {
  it('脏数据回退到安全默认值', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_NOTIFY_PREFERENCES);
    expect(sanitizePreferences([])).toEqual(DEFAULT_NOTIFY_PREFERENCES);
  });

  it('过滤非法提前量、非字符串去重键并裁剪长度', () => {
    const result = sanitizePreferences({
      enabled: true,
      leadMinutes: 999,
      seenKeys: ['a', 7, 'b'],
    });
    expect(result.enabled).toBe(true);
    expect(result.leadMinutes).toBe(60);
    expect(result.seenKeys).toEqual(['a', 'b']);
  });

  it('保留合法的自定义提前量', () => {
    expect(sanitizePreferences({ enabled: true, leadMinutes: 1440, seenKeys: [] }).leadMinutes).toBe(
      1440,
    );
  });
});
