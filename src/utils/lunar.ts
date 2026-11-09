/**
 * 离线农历显示。
 * 使用浏览器内置的 Intl 中国农历日历（ICU 数据随浏览器分发），零网络、零依赖、零体积；
 * 不用手写的年度数据表，避免年份覆盖不全与闰月误差。
 * 浏览器不支持 chinese calendar 时安全回退为空字符串，页面只显示公历。
 */

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 把 1–99 的数字转成中文读法，供「农历九月二十」这类文案使用。 */
export function chineseNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 99) return '';
  if (value <= 10) return CN_DIGITS[value];
  if (value < 20) return `十${CN_DIGITS[value - 10]}`;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${CN_DIGITS[tens]}十${ones === 0 ? '' : CN_DIGITS[ones]}`;
}

export interface LunarParts {
  month: number;
  day: number;
}

/** 读取中国农历的月与日；不支持时返回 null。 */
export function getChineseCalendarParts(date: Date): LunarParts | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'numeric',
      day: 'numeric',
    });
  } catch (error) {
    console.error('[timepin] Chinese calendar unavailable', error);
    return null;
  }

  if (formatter.resolvedOptions().calendar !== 'chinese') return null;

  const parts = formatter.formatToParts(date);
  const monthText = parts.find((part) => part.type === 'month')?.value ?? '';
  const dayText = parts.find((part) => part.type === 'day')?.value ?? '';
  // 闰月时 ICU 会在月份值里带「闰」或 "bis"，只取数字部分。
  const month = Number.parseInt(monthText.replace(/\D/g, ''), 10);
  const day = Number.parseInt(dayText.replace(/\D/g, ''), 10);

  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) return null;
  return { month, day };
}

/** 返回可直接展示的农历短语；不支持时为空字符串。 */
export function formatLunarDate(date: Date, language: 'zh' | 'en'): string {
  const parts = getChineseCalendarParts(date);
  if (!parts) return '';
  if (language === 'en') return `Lunar ${parts.month}/${parts.day}`;
  return `农历${chineseNumber(parts.month)}月${chineseNumber(parts.day)}`;
}
