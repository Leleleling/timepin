import Dexie, { type EntityTable } from 'dexie';
import { BACKUP_APP, BACKUP_SCHEMA_VERSION, type BackupSnapshot, type ImportMode } from '../utils/backup';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_URGENCY_PROFILE,
  type AppSettings,
  type Task,
  type UrgencyProfile,
} from './models';

/**
 * 本地唯一数据源：浏览器 IndexedDB。
 * 三张表均以 id 为主键；tasks 上的复合索引供按时间、状态、置顶与重要度筛选。
 */
export class TimePinDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  urgencyProfile!: EntityTable<UrgencyProfile, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('timepin');
    this.version(1).stores({
      tasks: 'id, startAt, dueAt, status, pinned, importance, urgencyScore, createdAt, updatedAt',
      urgencyProfile: 'id',
      settings: 'id',
    });
  }
}

export const db = new TimePinDB();

/**
 * 应用启动时调用：保证 settings 一定存在。
 * 刻意不自动写入 urgencyProfile —— 该表的缺失是首次问卷的触发条件（总纲 4.5）。
 */
export async function ensureDefaults(): Promise<AppSettings> {
  const stored = await db.settings.get('default');
  // 与默认合并，自动补齐旧数据缺失的字段（如 accent），避免读取到 undefined。
  const merged = { ...DEFAULT_APP_SETTINGS, ...(stored ?? {}) } as AppSettings;
  if (!stored) await db.settings.put(merged);
  return merged;
}

/** 算法层读取问卷配置；未作答时返回内存默认值，不落库、不改变接口。 */
export async function getUrgencyProfile(): Promise<UrgencyProfile> {
  const stored = await db.urgencyProfile.get('default');
  if (stored) return stored;
  return {
    ...DEFAULT_URGENCY_PROFILE,
    answers: { ...DEFAULT_URGENCY_PROFILE.answers },
  };
}

/** 路由拦截依据：只有真正保存过问卷（含跳过）才返回 true。 */
export async function hasUrgencyProfile(): Promise<boolean> {
  return (await db.urgencyProfile.get('default')) !== undefined;
}

/** 供首次问卷页保存答案或跳过结果。 */
export async function saveUrgencyProfile(profile: UrgencyProfile): Promise<void> {
  await db.urgencyProfile.put(profile);
}

/** 一次只读事务导出三张表，保证快照内部一致。 */
export async function readBackupSnapshot(): Promise<BackupSnapshot> {
  return db.transaction('r', db.tasks, db.urgencyProfile, db.settings, async () => {
    const tasks = await db.tasks.toArray();
    const profile = await db.urgencyProfile.get('default');
    const storedSettings = await db.settings.get('default');
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      app: BACKUP_APP,
      tasks,
      urgencyProfile: profile ?? null,
      settings: storedSettings ?? DEFAULT_APP_SETTINGS,
    };
  });
}

/**
 * 单个读写事务写入备份。
 * merge：按 id 覆盖同名任务，保留本机其余数据；
 * replace：先清空任务与问卷，再写入文件内容（问卷缺失时会重新触发首次校准）。
 */
export async function applyBackupSnapshot(
  snapshot: BackupSnapshot,
  mode: ImportMode,
): Promise<void> {
  await db.transaction('rw', db.tasks, db.urgencyProfile, db.settings, async () => {
    if (mode === 'replace') {
      await db.tasks.clear();
      await db.urgencyProfile.clear();
    }
    if (snapshot.tasks.length > 0) await db.tasks.bulkPut(snapshot.tasks);
    if (snapshot.urgencyProfile) await db.urgencyProfile.put(snapshot.urgencyProfile);
    await db.settings.put(snapshot.settings);
  });
}

export type { AppSettings, Task, UrgencyProfile, Importance, TaskStatus } from './models';
