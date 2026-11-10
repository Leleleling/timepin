import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, DEFAULT_URGENCY_PROFILE, type AppSettings } from '../db/models';
import {
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  parseBackup,
  sanitizeSettings,
  serializeBackup,
  type BackupSnapshot,
} from './backup';
import {
  isQuietHour,
  notifySeenKey,
  pruneSeenKeys,
  sanitizePreferences,
  SEEN_TTL_MS,
} from './notify';

function snapshot(settings: AppSettings): BackupSnapshot {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: 1_700_000_000_000,
    app: BACKUP_APP,
    tasks: [],
    urgencyProfile: { ...DEFAULT_URGENCY_PROFILE },
    settings,
  };
}

describe('backup hardening', () => {
  it('非法 accent 的备份被拒绝，不进入落库流程', () => {
    const bad = {
      ...DEFAULT_APP_SETTINGS,
      accent: 'neon' as unknown as AppSettings['accent'],
    };
    const result = parseBackup(serializeBackup(snapshot(bad)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalidShape');
  });

  it('净化把非法 accent 回退到默认，并保留合法外观字段', () => {
    const clean = sanitizeSettings({
      accent: 'neon',
      customAccent: '#123456',
      darkAccent: 'blue',
      darkCustomAccent: 'nope',
      density: 'compact',
      fontScale: 'large',
    });
    expect(clean.accent).toBe('red');
    expect(clean.customAccent).toBe('#123456');
    expect(clean.darkAccent).toBe('blue');
    expect(clean.darkCustomAccent).toBeUndefined();
    expect(clean.density).toBe('compact');
    expect(clean.fontScale).toBe('large');
  });

  it('非法外观字段回落到安全默认值', () => {
    const clean = sanitizeSettings({ density: 'huge', fontScale: 12, darkAccent: 'neon' });
    expect(clean.density).toBe('normal');
    expect(clean.fontScale).toBe('normal');
    expect(clean.darkAccent).toBeUndefined();
  });
});

describe('notification hardening', () => {
  it('去重键包含提前量，改提前量后可重新提醒', () => {
    const task = {
      id: 'a',
      dueAt: 1_700_000_000_000,
    } as Parameters<typeof notifySeenKey>[0];
    expect(notifySeenKey(task, 15)).not.toBe(notifySeenKey(task, 60));
    expect(notifySeenKey(task, 60)).toContain(':60');
  });

  it('跨午夜的免打扰区间判断正确', () => {
    const quiet = { start: 22, end: 7 };
    expect(isQuietHour(new Date(2026, 0, 1, 23).getTime(), quiet)).toBe(true);
    expect(isQuietHour(new Date(2026, 0, 1, 3).getTime(), quiet)).toBe(true);
    expect(isQuietHour(new Date(2026, 0, 1, 12).getTime(), quiet)).toBe(false);
    expect(isQuietHour(new Date(2026, 0, 1, 23).getTime(), undefined)).toBe(false);
    expect(isQuietHour(new Date(2026, 0, 1, 23).getTime(), { start: 8, end: 8 })).toBe(false);
  });

  it('pruneSeenKeys 淘汰过期键但保留异常格式键', () => {
    const now = 1_800_000_000_000;
    const stale = `a:${now - SEEN_TTL_MS - 1}:60`;
    const fresh = `b:${now - 1000}:60`;
    const legacy = 'c:none';
    expect(pruneSeenKeys([stale, fresh, legacy], now)).toEqual([fresh, legacy]);
  });

  it('净化偏好时保留合法免打扰时段并清理过期 seenKeys', () => {
    const prefs = sanitizePreferences({
      enabled: true,
      leadMinutes: 15,
      quietHours: { start: 23, end: 6 },
      seenKeys: ['a:none'],
    });
    expect(prefs.quietHours).toEqual({ start: 23, end: 6 });
    expect(prefs.seenKeys).toEqual(['a:none']);
    expect(sanitizePreferences({ quietHours: { start: 99, end: -1 } }).quietHours).toBeUndefined();
  });
});
