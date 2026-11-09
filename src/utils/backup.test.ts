import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS, DEFAULT_URGENCY_PROFILE, type Task } from '../db/models';
import {
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  parseBackup,
  planImport,
  serializeBackup,
  validateBackup,
  type BackupSnapshot,
} from './backup';

const NOW = 1_700_000_000_000;

function task(id: string): Task {
  return {
    id,
    title: '写周报',
    startAt: NOW,
    dueAt: NOW + 86_400_000,
    importance: 3,
    urgencyScore: 4.2,
    status: 'todo',
    pinned: false,
    tags: ['工作'],
    subtasks: [{ id: 's1', title: '整理指标', done: false }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function snapshot(): BackupSnapshot {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: NOW,
    app: BACKUP_APP,
    tasks: [task('a'), task('b')],
    urgencyProfile: { ...DEFAULT_URGENCY_PROFILE },
    settings: { ...DEFAULT_APP_SETTINGS },
  };
}

describe('validateBackup', () => {
  it('接受完整快照', () => {
    const result = validateBackup(snapshot());
    expect(result.ok).toBe(true);
  });

  it('版本不符单独报错', () => {
    expect(validateBackup({ ...snapshot(), schemaVersion: 99 })).toEqual({
      ok: false,
      error: 'versionMismatch',
    });
  });

  it('拒绝错误应用标识与非对象', () => {
    expect(validateBackup({ ...snapshot(), app: 'other' }).ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup([]).ok).toBe(false);
  });

  it('拒绝字段类型错误与非法枚举', () => {
    expect(validateBackup({ ...snapshot(), tasks: [{ id: 'x' }] }).ok).toBe(false);
    const badStatus = snapshot();
    badStatus.tasks[0].status = 'unknown' as Task['status'];
    expect(validateBackup(badStatus).ok).toBe(false);
    expect(validateBackup({ ...snapshot(), settings: null }).ok).toBe(false);
    expect(validateBackup({ ...snapshot(), urgencyProfile: { id: 'default' } }).ok).toBe(false);
  });

  it('接受空任务与 null 问卷', () => {
    expect(validateBackup({ ...snapshot(), tasks: [], urgencyProfile: null }).ok).toBe(true);
  });

  it('人工象限字段可缺省、可无损往返，非法枚举被拒绝', () => {
    const withOverride = snapshot();
    withOverride.tasks[0].boardQuadrant = 3;
    const parsed = parseBackup(serializeBackup(withOverride));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.tasks[0].boardQuadrant).toBe(3);
      expect(parsed.data.tasks[1].boardQuadrant).toBeUndefined();
    }
    const invalid = snapshot();
    invalid.tasks[0].boardQuadrant = 9 as unknown as Task['boardQuadrant'];
    expect(validateBackup(invalid).ok).toBe(false);
  });
});

describe('parseBackup / serializeBackup', () => {
  it('序列化后可无损解析', () => {
    const original = snapshot();
    const result = parseBackup(serializeBackup(original));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tasks).toHaveLength(2);
  });

  it('非法 JSON 返回可判别错误', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(parseBackup('{not json')).toEqual({ ok: false, error: 'invalidJson' });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});

describe('planImport', () => {
  it('merge 模式列出任务数与默认警告', () => {
    const plan = planImport(snapshot(), 'merge');
    expect(plan.taskCount).toBe(2);
    expect(plan.hasProfile).toBe(true);
    expect(plan.settingsIncluded).toBe(true);
    expect(plan.warnings).toEqual(['profile', 'settings']);
  });

  it('replace 模式追加清空警告', () => {
    const plan = planImport({ ...snapshot(), urgencyProfile: null }, 'replace');
    expect(plan.hasProfile).toBe(false);
    expect(plan.warnings).toEqual(['settings', 'replace']);
  });
});
