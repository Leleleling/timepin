import { describe, expect, it } from 'vitest';
import {
  DEFAULT_URGENCY_PROFILE,
  type UrgencyAnswers,
  type UrgencyProfile,
} from '../db/models';
import { calculateUrgency, clampScore, URGENCY_NODES } from './urgency';

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;
const profile = DEFAULT_URGENCY_PROFILE;

function flatProfile(value: number): UrgencyProfile {
  const answers = Object.fromEntries(
    Object.keys(profile.answers).map((key) => [key, value]),
  ) as UrgencyAnswers;
  return { id: 'default', isSkipped: true, answers };
}

describe('clampScore', () => {
  it('限制在 1.0 - 5.0 并保留一位小数', () => {
    expect(clampScore(9.99)).toBe(5);
    expect(clampScore(-3)).toBe(1);
    expect(clampScore(3.46)).toBe(3.5);
    expect(clampScore(3.44)).toBe(3.4);
  });

  it('非有限值被安全处理，不会污染结果', () => {
    expect(clampScore(Number.NaN)).toBe(1);
    expect(clampScore(Number.POSITIVE_INFINITY)).toBe(5);
    expect(clampScore(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe('calculateUrgency', () => {
  it('已过期返回 expired', () => {
    expect(calculateUrgency(NOW - HOUR, profile, NOW)).toBe(5);
  });

  it('无截止日期或非法日期返回 noDue', () => {
    expect(calculateUrgency(null, profile, NOW)).toBe(1);
    expect(calculateUrgency(undefined, profile, NOW)).toBe(1);
    expect(calculateUrgency(Number.NaN, profile, NOW)).toBe(1);
  });

  it('精确命中每个节点时返回该节点的问卷分数', () => {
    URGENCY_NODES.forEach((node) => {
      expect(calculateUrgency(NOW + node.hours * HOUR, profile, NOW)).toBe(
        clampScore(profile.answers[node.answerKey]),
      );
    });
  });

  it('节点之间按自然对数线性插值（6h 是 3h 与 12h 的对数中点）', () => {
    expect(calculateUrgency(NOW + 6 * HOUR, profile, NOW)).toBe(4.5);
  });

  it('距截止不足 3 小时钳制到首节点，不外推', () => {
    expect(calculateUrgency(NOW, profile, NOW)).toBe(4.8);
    expect(calculateUrgency(NOW + HOUR, profile, NOW)).toBe(4.8);
    expect(calculateUrgency(NOW + 2.9 * HOUR, profile, NOW)).toBe(4.8);
  });

  it('超过三个月钳制到末节点，不外推', () => {
    expect(calculateUrgency(NOW + 5000 * HOUR, profile, NOW)).toBe(1.2);
    expect(calculateUrgency(NOW + 2160 * HOUR, profile, NOW)).toBe(1.2);
  });

  it('问卷分数越界时仍被限制到 1.0 - 5.0', () => {
    expect(calculateUrgency(NOW + 6 * HOUR, flatProfile(9), NOW)).toBe(5);
    expect(calculateUrgency(NOW + 6 * HOUR, flatProfile(-2), NOW)).toBe(1);
    expect(calculateUrgency(null, flatProfile(9), NOW)).toBe(5);
    expect(calculateUrgency(NOW - HOUR, flatProfile(0), NOW)).toBe(1);
  });

  it('所有结果都只有一位小数', () => {
    [0.5, 4, 7, 18, 40, 100, 200, 500, 1000, 3000].forEach((hours) => {
      const score = calculateUrgency(NOW + hours * HOUR, profile, NOW);
      expect(Number.isInteger(score * 10)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    });
  });

  it('now 注入可以改变计算结果（时钟可测试）', () => {
    const dueAt = NOW + 6 * HOUR;
    expect(calculateUrgency(dueAt, profile, NOW)).toBe(4.5);
    expect(calculateUrgency(dueAt, profile, NOW + 3 * HOUR)).toBe(4.8);
    expect(calculateUrgency(dueAt, profile, NOW + 7 * HOUR)).toBe(5);
  });
});
