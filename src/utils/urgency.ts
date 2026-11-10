import type { UrgencyAnswerKey, UrgencyProfile } from '../db/models';

/**
 * 紧急度插值节点（总纲 3.1）。
 * hours 是「距离截止还有多少小时」，answerKey 指向首次问卷中用户为该刻度打的分。
 * 提为模块常量，避免每次计算都重建数组。
 */
export interface UrgencyNode {
  hours: number;
  answerKey: UrgencyAnswerKey;
}

export const URGENCY_NODES: readonly UrgencyNode[] = [
  { hours: 3, answerKey: 'within3h' },
  { hours: 12, answerKey: 'today' },
  { hours: 24, answerKey: 'in1d' },
  { hours: 72, answerKey: 'in3d' },
  { hours: 168, answerKey: 'in1w' },
  { hours: 336, answerKey: 'in2w' },
  { hours: 720, answerKey: 'in1m' },
  { hours: 2160, answerKey: 'in3m' },
] as const;

const MS_PER_HOUR = 1000 * 60 * 60;
const MIN_SCORE = 1.0;
const MAX_SCORE = 5.0;

/**
 * 把任意原始分数限制到 [1.0, 5.0] 并保留一位小数。
 * NaN 无法比较，降级为最低分；正负无穷由上下限钳制自然落到 5.0 / 1.0。
 */
export function clampScore(raw: number): number {
  if (Number.isNaN(raw)) return MIN_SCORE;
  const bounded = Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw));
  return Math.round(bounded * 10) / 10;
}

/**
 * 计算单个任务的紧急度。
 *
 * 规则（严格按总纲 3.1）：
 * 1. dueAt 为空 / 非法 → noDue；
 * 2. h < 0 → expired；
 * 3. 其余情况把 h 与节点都取自然对数 x = ln(h)，在相邻节点间做线性插值
 *    score = s1 + (s2 - s1) * (x - x1) / (x2 - x1)；
 * 4. 结果统一钳制到 [1.0, 5.0]，保留一位小数。
 *
 * 边界说明：h ∈ [0, 3) 时 ln(h) 无意义或落在首节点左侧，h > 2160 时落在末节点右侧，
 * 两者都没有可供插值的相邻区间，因此按「钳制到首／末节点分数」处理，不做外推。
 * now 可注入，便于在单元测试里固定时钟。
 */
export function calculateUrgency(
  dueAt: number | null | undefined,
  profile: UrgencyProfile,
  now: number = Date.now(),
): number {
  if (dueAt === null || dueAt === undefined || !Number.isFinite(dueAt)) {
    return clampScore(profile.answers.noDue);
  }

  const reference = Number.isFinite(now) ? now : Date.now();
  const hours = (dueAt - reference) / MS_PER_HOUR;

  if (hours < 0) {
    return clampScore(profile.answers.expired);
  }

  const first = URGENCY_NODES[0];
  const last = URGENCY_NODES[URGENCY_NODES.length - 1];

  if (hours <= first.hours) {
    return clampScore(profile.answers[first.answerKey]);
  }
  if (hours >= last.hours) {
    return clampScore(profile.answers[last.answerKey]);
  }

  const x = Math.log(hours);

  for (let i = 0; i < URGENCY_NODES.length - 1; i += 1) {
    const left = URGENCY_NODES[i];
    const right = URGENCY_NODES[i + 1];
    const x1 = Math.log(left.hours);
    const x2 = Math.log(right.hours);

    if (x >= x1 && x <= x2) {
      const s1 = profile.answers[left.answerKey];
      const s2 = profile.answers[right.answerKey];
      const ratio = (x - x1) / (x2 - x1);
      return clampScore(s1 + (s2 - s1) * ratio);
    }
  }

  // 理论上不可达：上面已经覆盖了 (3, 2160) 区间，作为数值异常的兜底。
  return clampScore(profile.answers[last.answerKey]);
}

export interface CurvePoint {
  hours: number;
  score: number;
}

/**
 * U25：按对数等距采样曲线，供设置页可视化。
 * 与 calculateUrgency 共用同一插值实现，避免预览与实际算分出现两套口径。
 */
export function urgencyCurve(
  profile: UrgencyProfile,
  samples: number = 48,
  now: number = Date.now(),
): CurvePoint[] {
  const count = Math.max(2, Math.floor(samples));
  const first = URGENCY_NODES[0].hours;
  const last = URGENCY_NODES[URGENCY_NODES.length - 1].hours;
  return Array.from({ length: count }, (_, index) => {
    const hours = first * Math.pow(last / first, index / (count - 1));
    return {
      hours,
      score: calculateUrgency(now + hours * MS_PER_HOUR, profile, now),
    };
  });
}
