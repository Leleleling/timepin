import { describe, expect, it } from 'vitest';
import { ACCENTS, accentHex, accentVars, isAccentKey, isHexColor, safeAccent } from './accents';
import { zh, en } from './dictionaries';

/** 递归收集字典的叶子键路径，用于自动校验中英键完整性（U30）。 */
function paths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('accents', () => {
  it('白名单只接受六色预设键', () => {
    expect(Object.keys(ACCENTS).every(isAccentKey)).toBe(true);
    expect(isAccentKey('bogus')).toBe(false);
    expect(isAccentKey(null)).toBe(false);
    expect(safeAccent('bogus')).toBe('red');
    expect(safeAccent('violet')).toBe('violet');
  });

  it('自定义色只接受 #RRGGBB', () => {
    expect(isHexColor('#A1B2C3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('rgb(1,2,3)')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });

  it('合法自定义色优先于预设，非法值回落到预设', () => {
    expect(accentHex('blue', '#123456')).toBe('#123456');
    expect(accentHex('blue', 'not-a-color')).toBe(ACCENTS.blue.brand);
  });

  it('任意色也能派生出整套 CSS 变量', () => {
    const vars = accentVars('red', '#336699');
    expect(vars.hex).toBe('#336699');
    expect(vars.brand.split(' ')).toHaveLength(3);
    expect(vars.brand).toBe('51 102 153');
    expect(vars.soft).not.toBe(vars.deep);
  });
});

describe('dictionaries', () => {
  it('中文与英文字典键结构完全一致', () => {
    expect(paths(zh).sort()).toEqual(paths(en).sort());
  });

  it('所有叶子文案都是非空字符串或数组', () => {
    const empty = (value: unknown, prefix = ''): string[] => {
      if (typeof value === 'string') return value.trim() ? [] : [prefix];
      if (Array.isArray(value)) return value.length > 0 ? [] : [prefix];
      if (typeof value !== 'object' || value === null) return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        empty(child, prefix ? `${prefix}.${key}` : key),
      );
    };
    expect(empty(zh)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
