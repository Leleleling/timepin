import {
  DEFAULT_URGENCY_ANSWERS,
  type UrgencyAnswers,
  type UrgencyAnswerKey,
  type UrgencyProfile,
} from '../db/models';

export type AnswerKey = UrgencyAnswerKey;

export interface Question {
  key: AnswerKey;
  /** 该刻度对应的小时数；已过期与无截止日期为 null。 */
  hours: number | null;
}

/** 十题与 UrgencyProfile.answers 的十个键一一对应，顺序即问卷呈现顺序。 */
export const QUESTIONNAIRE: readonly Question[] = [
  { key: 'expired', hours: null },
  { key: 'within3h', hours: 3 },
  { key: 'today', hours: 12 },
  { key: 'in1d', hours: 24 },
  { key: 'in3d', hours: 72 },
  { key: 'in1w', hours: 168 },
  { key: 'in2w', hours: 336 },
  { key: 'in1m', hours: 720 },
  { key: 'in3m', hours: 2160 },
  { key: 'noDue', hours: null },
];

/** 五个选项固定映射到 1.0 / 2.0 / 3.0 / 4.0 / 5.0，与 clampScore 的取值区间一致。 */
export const OPTION_SCORES: readonly number[] = [1, 2, 3, 4, 5];

/** 把逐题选择转成答案对象；缺答或越界的选择回退到内置默认值。 */
export function answersFromSelections(selections: (number | null)[]): UrgencyAnswers {
  const answers: UrgencyAnswers = { ...DEFAULT_URGENCY_ANSWERS };
  QUESTIONNAIRE.forEach((question, index) => {
    const selection = selections[index];
    if (
      typeof selection === 'number' &&
      Number.isInteger(selection) &&
      selection >= 0 &&
      selection < OPTION_SCORES.length
    ) {
      answers[question.key] = OPTION_SCORES[selection];
    }
  });
  return answers;
}

/** 跳过后写入的 profile：使用硬编码默认曲线，并打上跳过标记。 */
export function skippedProfile(): UrgencyProfile {
  return {
    id: 'default',
    isSkipped: true,
    answers: { ...DEFAULT_URGENCY_ANSWERS },
  };
}

/** 完整作答后写入的 profile。 */
export function answeredProfile(selections: (number | null)[]): UrgencyProfile {
  return {
    id: 'default',
    isSkipped: false,
    answers: answersFromSelections(selections),
  };
}
