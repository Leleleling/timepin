import { describe, expect, it } from 'vitest';
import { DEFAULT_URGENCY_ANSWERS } from '../db/models';
import {
  OPTION_SCORES,
  QUESTIONNAIRE,
  answeredProfile,
  answersFromSelections,
  skippedProfile,
} from './questionnaire';

describe('QUESTIONNAIRE', () => {
  it('恰好十题，键唯一且完整覆盖 answers', () => {
    const keys = QUESTIONNAIRE.map((question) => question.key);
    expect(keys).toHaveLength(10);
    expect(new Set(keys).size).toBe(10);
    expect([...keys].sort()).toEqual(Object.keys(DEFAULT_URGENCY_ANSWERS).sort());
  });

  it('对数插值节点与刻度一致', () => {
    expect(QUESTIONNAIRE.find((item) => item.key === 'within3h')?.hours).toBe(3);
    expect(QUESTIONNAIRE.find((item) => item.key === 'in3m')?.hours).toBe(2160);
    expect(QUESTIONNAIRE.find((item) => item.key === 'noDue')?.hours).toBeNull();
  });
});

describe('answersFromSelections', () => {
  it('五档选项映射为 1.0 到 5.0', () => {
    expect(OPTION_SCORES).toEqual([1, 2, 3, 4, 5]);
    expect(answersFromSelections(QUESTIONNAIRE.map(() => 4)).expired).toBe(5);
    expect(answersFromSelections(QUESTIONNAIRE.map(() => 0)).in1w).toBe(1);
    expect(answersFromSelections(QUESTIONNAIRE.map(() => 2)).in1d).toBe(3);
  });

  it('缺答与越界选择回退到默认值', () => {
    const answers = answersFromSelections([4, null, 99, -1]);
    expect(answers.expired).toBe(5);
    expect(answers.within3h).toBe(DEFAULT_URGENCY_ANSWERS.within3h);
    expect(answers.today).toBe(DEFAULT_URGENCY_ANSWERS.today);
    expect(answers.in1d).toBe(DEFAULT_URGENCY_ANSWERS.in1d);
  });
});

describe('profile 构造', () => {
  it('跳过使用默认曲线并标记 isSkipped', () => {
    const profile = skippedProfile();
    expect(profile.id).toBe('default');
    expect(profile.isSkipped).toBe(true);
    expect(profile.answers).toEqual(DEFAULT_URGENCY_ANSWERS);
  });

  it('作答结果不标记跳过', () => {
    const profile = answeredProfile(QUESTIONNAIRE.map(() => 3));
    expect(profile.isSkipped).toBe(false);
    expect(profile.answers.noDue).toBe(4);
  });
});
