import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type Task,
  type UrgencyProfile,
} from '../db/models';
import { isAccentKey, isHexColor, safeAccent, safeHexColor } from './accents';

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP = 'timepin';

export interface BackupSnapshot {
  schemaVersion: number;
  exportedAt: number;
  app: typeof BACKUP_APP;
  tasks: Task[];
  urgencyProfile: UrgencyProfile | null;
  settings: AppSettings;
}

export type ImportMode = 'merge' | 'replace';
export type BackupError = 'invalidJson' | 'invalidShape' | 'versionMismatch';

export type ParseResult =
  | { ok: true; data: BackupSnapshot }
  | { ok: false; error: BackupError };

export interface ImportPlan {
  taskCount: number;
  hasProfile: boolean;
  settingsIncluded: boolean;
  warnings: ('profile' | 'settings' | 'replace')[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  const statuses = ['todo', 'done', 'archived', 'trash'];
  const dueAt = value.dueAt;
  const content = value.content;
  const subtasks = value.subtasks;
  const boardQuadrant = value.boardQuadrant;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (content === undefined || typeof content === 'string') &&
    isFiniteNumber(value.startAt) &&
    (dueAt === undefined || dueAt === null || isFiniteNumber(dueAt)) &&
    (value.importance === 1 || value.importance === 2 || value.importance === 3) &&
    isFiniteNumber(value.urgencyScore) &&
    typeof value.status === 'string' &&
    statuses.includes(value.status) &&
    typeof value.pinned === 'boolean' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(subtasks) &&
    subtasks.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.done === 'boolean',
    ) &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt) &&
    (boardQuadrant === undefined ||
      boardQuadrant === 1 ||
      boardQuadrant === 2 ||
      boardQuadrant === 3 ||
      boardQuadrant === 4)
  );
}

function validProfile(value: unknown): value is UrgencyProfile {
  if (!isRecord(value) || value.id !== 'default' || typeof value.isSkipped !== 'boolean') {
    return false;
  }
  const answers = value.answers;
  if (!isRecord(answers)) return false;
  return (
    [
      'expired', 'within3h', 'today', 'in1d', 'in3d',
      'in1w', 'in2w', 'in1m', 'in3m', 'noDue',
    ] as const
  ).every((key) => isFiniteNumber(answers[key]));
}

function validSettings(value: unknown): value is AppSettings {
  if (!isRecord(value) || value.id !== 'default') return false;
  const colorMap = value.colorMap;
  const weights = value.weights;
  return (
    ['light', 'dark', 'system'].includes(String(value.theme)) &&
    ['zh', 'en'].includes(String(value.language)) &&
    isRecord(colorMap) &&
    isHexColor(colorMap.high) &&
    isHexColor(colorMap.medium) &&
    isHexColor(colorMap.low) &&
    isRecord(weights) &&
    isFiniteNumber(weights.importance) &&
    isFiniteNumber(weights.urgency) &&
    isFiniteNumber(value.urgencyThreshold) &&
    // 旧版备份没有 accent 是合法的（净化时补默认值）；存在但非法则拒绝导入，
    // 否则 ACCENTS[accent] 会在渲染期抛错并整页白屏。新增外观字段同样先校验再净化。
    (value.accent === undefined || isAccentKey(value.accent)) &&
    (value.darkAccent === undefined || isAccentKey(value.darkAccent)) &&
    (value.customAccent === undefined || isHexColor(value.customAccent)) &&
    (value.darkCustomAccent === undefined || isHexColor(value.darkCustomAccent)) &&
    (value.density === undefined ||
      value.density === 'compact' ||
      value.density === 'normal' ||
      value.density === 'roomy') &&
    (value.fontScale === undefined ||
      value.fontScale === 'small' ||
      value.fontScale === 'normal' ||
      value.fontScale === 'large')
  );
}

/**
 * 把任意（已通过 validSettings 的）设置对象净化成完整 AppSettings。
 * 这是导入落库前唯一的收敛点：补齐旧版缺失字段、把非法 accent 回退到默认值。
 */
export function sanitizeSettings(value: unknown): AppSettings {
  const base: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    colorMap: { ...DEFAULT_APP_SETTINGS.colorMap },
    weights: { ...DEFAULT_APP_SETTINGS.weights },
  };
  if (!isRecord(value)) return base;

  const colorMap = value.colorMap;
  const weights = value.weights;
  return {
    ...base,
    theme:
      value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
        ? value.theme
        : base.theme,
    language: value.language === 'en' ? 'en' : 'zh',
    accent: safeAccent(value.accent),
    customAccent: safeHexColor(value.customAccent),
    darkAccent: isAccentKey(value.darkAccent) ? value.darkAccent : undefined,
    darkCustomAccent: safeHexColor(value.darkCustomAccent),
    density:
      value.density === 'compact' || value.density === 'roomy' ? value.density : 'normal',
    fontScale:
      value.fontScale === 'small' || value.fontScale === 'large'
        ? value.fontScale
        : 'normal',
    colorMap: isRecord(colorMap)
      ? {
          high: isHexColor(colorMap.high) ? colorMap.high : base.colorMap.high,
          medium: isHexColor(colorMap.medium) ? colorMap.medium : base.colorMap.medium,
          low: isHexColor(colorMap.low) ? colorMap.low : base.colorMap.low,
        }
      : base.colorMap,
    weights: isRecord(weights)
      ? {
          importance: isFiniteNumber(weights.importance)
            ? weights.importance
            : base.weights.importance,
          urgency: isFiniteNumber(weights.urgency) ? weights.urgency : base.weights.urgency,
        }
      : base.weights,
    urgencyThreshold: isFiniteNumber(value.urgencyThreshold)
      ? value.urgencyThreshold
      : base.urgencyThreshold,
  };
}

/** 纯校验函数，不抛异常；未知结构一律给出可判别错误。 */
export function validateBackup(value: unknown): ParseResult {
  if (!isRecord(value)) return { ok: false, error: 'invalidShape' };
  if (value.app !== BACKUP_APP) return { ok: false, error: 'invalidShape' };
  if (value.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'versionMismatch' };
  }
  if (
    !isFiniteNumber(value.exportedAt) ||
    !Array.isArray(value.tasks) ||
    !value.tasks.every(validTask) ||
    (value.urgencyProfile !== null && !validProfile(value.urgencyProfile)) ||
    !validSettings(value.settings)
  ) {
    return { ok: false, error: 'invalidShape' };
  }
  const snapshot = value as unknown as BackupSnapshot;
  // 唯一收敛点：把旧版缺失字段补齐、非法 accent 回退，保证下游拿到的总是干净设置。
  return { ok: true, data: { ...snapshot, settings: sanitizeSettings(snapshot.settings) } };
}

/** 解析备份文本；JSON.parse 的同步异常在此唯一收口，记录后返回错误结果。 */
export function parseBackup(raw: string): ParseResult {
  try {
    return validateBackup(JSON.parse(raw) as unknown);
  } catch (error) {
    console.error('[timepin] Invalid backup JSON', error);
    return { ok: false, error: 'invalidJson' };
  }
}

export function serializeBackup(snapshot: BackupSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/** 生成导入前的确认摘要，避免静默清空本机数据。 */
export function planImport(snapshot: BackupSnapshot, mode: ImportMode): ImportPlan {
  const settingsIncluded =
    isRecord(snapshot.settings) && snapshot.settings.id === 'default';
  const warnings: ImportPlan['warnings'] = settingsIncluded ? ['settings'] : [];
  if (snapshot.urgencyProfile) warnings.unshift('profile');
  if (mode === 'replace') warnings.push('replace');
  return {
    taskCount: snapshot.tasks.length,
    hasProfile: snapshot.urgencyProfile !== null,
    settingsIncluded,
    warnings,
  };
}
