import { describe, expect, it } from 'vitest';
import { chineseNumber, formatLunarDate, getChineseCalendarParts } from './lunar';

const sample = new Date('2026-11-09T12:00:00');

describe('chineseNumber', () => {
  it('覆盖个位、十位与整十', () => {
    expect(chineseNumber(0)).toBe('零');
    expect(chineseNumber(1)).toBe('一');
    expect(chineseNumber(9)).toBe('九');
    expect(chineseNumber(10)).toBe('十');
    expect(chineseNumber(11)).toBe('十一');
    expect(chineseNumber(20)).toBe('二十');
    expect(chineseNumber(21)).toBe('二十一');
    expect(chineseNumber(30)).toBe('三十');
  });

  it('非法值返回空字符串', () => {
    expect(chineseNumber(-1)).toBe('');
    expect(chineseNumber(100)).toBe('');
    expect(chineseNumber(Number.NaN)).toBe('');
  });
});

describe('formatLunarDate', () => {
  const supported = getChineseCalendarParts(sample) !== null;

  it('中文模式返回农历短语，或在不支持时安全回退', () => {
    const label = formatLunarDate(sample, 'zh');
    if (supported) {
      expect(label).toMatch(/^农历.+月.+/);
    } else {
      expect(label).toBe('');
    }
  });

  it('英文模式返回 Lunar 前缀，或在不支持时安全回退', () => {
    const label = formatLunarDate(sample, 'en');
    if (supported) {
      expect(label).toMatch(/^Lunar \d+\/\d+$/);
    } else {
      expect(label).toBe('');
    }
  });
});
