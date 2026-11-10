/**
 * 时光扣的持久化数据契约。
 * 字段名与联合类型严格遵循《全栈 AI 开发总纲》2.1，供 Dexie、算法层与 UI 层共用。
 */

export type Importance = 1 | 2 | 3; // 1低 2中 3高
export type TaskStatus = 'todo' | 'done' | 'archived' | 'trash';
/** 可自定义的全局主题强调色预设键。 */
export type AccentKey = 'red' | 'blue' | 'green' | 'violet' | 'amber' | 'teal';
/** 界面密度档位；缺省 normal，旧数据无需迁移。 */
export type Density = 'compact' | 'normal' | 'roomy';
/** 字号档位；缺省 normal。 */
export type FontScale = 'small' | 'normal' | 'large';
/** 周期规则；按本地日历推进，避免夏令时偏移。 */
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly';
/** 看板人工归类后的象限；可选字段，缺省时由 quadrantOf 自动计算。 */
export type BoardQuadrant = 1 | 2 | 3 | 4;

export interface Task {
  id: string; // crypto.randomUUID()
  title: string;
  content?: string;
  startAt: number; // 时间戳 (ms)
  dueAt?: number | null; // 时间戳 (ms)
  importance: Importance;
  urgencyScore: number; // 1.0 - 5.0 (由算法生成)
  status: TaskStatus;
  pinned: boolean;
  tags: string[];
  subtasks: { id: string; title: string; done: boolean }[];
  createdAt: number;
  updatedAt: number;
  /** 看板拖拽归类的人工覆盖；不参与首页排序，也不影响紧急度算分。 */
  boardQuadrant?: BoardQuadrant;
  /** 移入回收站之前的状态；恢复时据此还原，而不是一律变回待办。 */
  preTrashStatus?: TaskStatus;
  /** 置顶任务的手动顺序；数值越小越靠前，缺省由排序退回到原有规则。 */
  manualOrder?: number;
  /** 周期规则；完成后自动生成下一次实例。 */
  recurrence?: RecurrenceRule;
  /** 最近一次发出到期提醒的时间戳，供「已提醒」状态展示（U27）。 */
  lastNotifiedAt?: number;
}

export interface UrgencyProfile {
  id: 'default';
  isSkipped: boolean;
  answers: {
    expired: number; within3h: number; today: number; in1d: number;
    in3d: number; in1w: number; in2w: number; in1m: number; in3m: number; noDue: number;
  };
}

export interface AppSettings {
  id: 'default';
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  accent: AccentKey;
  /** 以下均为后续版本新增的可选外观字段，旧备份缺失时由 sanitizeSettings 补默认值。 */
  customAccent?: string;
  darkAccent?: AccentKey;
  darkCustomAccent?: string;
  density?: Density;
  fontScale?: FontScale;
  colorMap: { high: string; medium: string; low: string };
  weights: { importance: number; urgency: number };
  urgencyThreshold: number;
}

/** 问卷答案的键集合，供对数插值节点表复用。 */
export type UrgencyAnswers = UrgencyProfile['answers'];
export type UrgencyAnswerKey = keyof UrgencyAnswers;

/**
 * 跳过问卷时使用的硬编码默认分数。
 * 从「已过期」到「三个月后」单调递减，无截止日期最低。
 */
export const DEFAULT_URGENCY_ANSWERS: UrgencyAnswers = {
  expired: 5.0,
  within3h: 4.8,
  today: 4.2,
  in1d: 3.8,
  in3d: 3.2,
  in1w: 2.6,
  in2w: 2.1,
  in1m: 1.6,
  in3m: 1.2,
  noDue: 1.0,
};

/**
 * 问卷未作答时算法层使用的默认 profile。
 * 注意：它只是内存回退值，不会在启动时写入 urgencyProfile 表，
 * 否则「无记录即强制进入首次问卷」的路由拦截永远不会触发。
 */
export const DEFAULT_URGENCY_PROFILE: UrgencyProfile = {
  id: 'default',
  isSkipped: false,
  answers: DEFAULT_URGENCY_ANSWERS,
};

/** 首次启动时写入 settings 表的默认设置。 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'default',
  theme: 'system',
  language: 'zh',
  accent: 'red',
  colorMap: {
    high: '#E5484D',
    medium: '#F5A623',
    low: '#6B7280',
  },
  weights: {
    importance: 1,
    urgency: 1,
  },
  urgencyThreshold: 3.5,
};
