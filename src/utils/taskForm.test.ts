import { describe, expect, it } from 'vitest';
import type { Task } from '../db/models';
import {
  buildTask,
  draftFromPrefill,
  draftFromTask,
  emptyDraft,
  parseDueTimestamp,
  validateDraft,
  type TaskDraft,
} from './taskForm';

const START = new Date('2026-11-09T08:00:00').getTime();

function draft(patch: Partial<TaskDraft> = {}): TaskDraft {
  return { ...emptyDraft(), title: '写周报', ...patch };
}

function sampleTask(): Task {
  return {
    id: 'task-1',
    title: '准备季度复盘',
    content: '带上数据看板',
    startAt: START,
    dueAt: new Date('2026-11-10T18:30:00').getTime(),
    importance: 3,
    urgencyScore: 4.2,
    status: 'todo',
    pinned: true,
    tags: ['工作'],
    subtasks: [{ id: 's1', title: '整理指标', done: false }],
    createdAt: START,
    updatedAt: START,
  };
}

describe('parseDueTimestamp', () => {
  it('无截止日期返回 null', () => {
    expect(parseDueTimestamp(draft())).toBeNull();
  });

  it('只有日期时按当天末尾处理', () => {
    const value = parseDueTimestamp(draft({ dueDate: '2026-11-10' }));
    const date = new Date(value as number);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(10);
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
  });

  it('填了时刻则以该时刻为准', () => {
    const value = parseDueTimestamp(draft({ dueDate: '2026-11-10', dueTime: '09:05' }));
    const date = new Date(value as number);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(5);
  });

  it('只有时刻没有日期视为非法', () => {
    expect(parseDueTimestamp(draft({ dueTime: '09:05' }))).toBe('invalid');
  });

  it('拒绝会被自动进位的日期与越界时刻', () => {
    expect(parseDueTimestamp(draft({ dueDate: '2026-02-30' }))).toBe('invalid');
    expect(parseDueTimestamp(draft({ dueDate: '2026-11-10', dueTime: '25:00' }))).toBe('invalid');
    expect(parseDueTimestamp(draft({ dueDate: '11/10/2026' }))).toBe('invalid');
  });
});

describe('validateDraft', () => {
  it('空标题报错', () => {
    expect(validateDraft(draft({ title: '   ' }), START)).toEqual({
      ok: false,
      error: 'titleRequired',
    });
  });

  it('截止时间早于创建时间报错', () => {
    expect(validateDraft(draft({ dueDate: '2026-11-01' }), START)).toEqual({
      ok: false,
      error: 'dueBeforeStart',
    });
  });

  it('无截止日期与未来的截止日期均通过', () => {
    expect(validateDraft(draft(), START)).toEqual({ ok: true, dueAt: null });
    const result = validateDraft(draft({ dueDate: '2026-11-10' }), START);
    expect(result.ok).toBe(true);
  });

  it('编辑过期任务时以原 startAt 为基准仍可保存', () => {
    const oldStart = new Date('2026-01-01T08:00:00').getTime();
    expect(validateDraft(draft({ dueDate: '2026-11-01' }), oldStart).ok).toBe(true);
  });
});

describe('buildTask', () => {
  it('新建时生成 id、时间与默认状态', () => {
    const task = buildTask(draft({ importance: 3, tags: ['工作', ''] }), 4.5, START);
    expect(task.id).toBeTruthy();
    expect(task.startAt).toBe(START);
    expect(task.createdAt).toBe(START);
    expect(task.updatedAt).toBe(START);
    expect(task.status).toBe('todo');
    expect(task.urgencyScore).toBe(4.5);
    expect(task.tags).toEqual(['工作']);
    expect(task.content).toBeUndefined();
  });

  it('编辑时保留 id、createdAt、startAt、状态与看板人工归类', () => {
    const existing = { ...sampleTask(), status: 'done' as const, boardQuadrant: 4 as const };
    const built = buildTask(draftFromTask(existing), 3.9, START + 1000, existing);
    expect(built.id).toBe(existing.id);
    expect(built.createdAt).toBe(existing.createdAt);
    expect(built.startAt).toBe(existing.startAt);
    expect(built.status).toBe('done');
    expect(built.updatedAt).toBe(START + 1000);
    expect(built.subtasks).toEqual(existing.subtasks);
    expect(built.boardQuadrant).toBe(4);
  });
});

describe('草稿转换', () => {
  it('从任务回填日期、标签与子任务', () => {
    const converted = draftFromTask(sampleTask());
    expect(converted.title).toBe('准备季度复盘');
    expect(converted.dueDate).toBe('2026-11-10');
    expect(converted.dueTime).toBe('18:30');
    expect(converted.tags).toEqual(['工作']);
    expect(converted.subtasks[0].title).toBe('整理指标');
  });

  it('快捷链接只带入合法参数', () => {
    expect(draftFromPrefill({ title: '来自链接', due: START }).title).toBe('来自链接');
    expect(draftFromPrefill({ due: Number.NaN }).dueDate).toBe('');
    expect(draftFromPrefill(null).title).toBe('');
  });
});
