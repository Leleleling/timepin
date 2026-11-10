import type { AccentKey } from '../db/models';

/** 可选主题强调色预设；新增颜色只需在此登记一个十六进制值。 */
export const ACCENTS: Record<AccentKey, { brand: string }> = {
  red: { brand: '#E5484D' },
  blue: { brand: '#2F6FED' },
  green: { brand: '#15A34A' },
  violet: { brand: '#7C3AED' },
  amber: { brand: '#D98300' },
  teal: { brand: '#0E9E96' },
};

export const DEFAULT_ACCENT: AccentKey = 'red';

/** 白名单校验：设置可能来自导入的旧备份或手工编辑的 JSON，不能假定一定是合法键。 */
export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACCENTS, value);
}

export function safeAccent(value: unknown): AccentKey {
  return isAccentKey(value) ? value : DEFAULT_ACCENT;
}

/** 自定义主题色只接受 #RRGGBB，避免把任意字符串拼进 CSS 变量。 */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function safeHexColor(value: unknown): string | undefined {
  return isHexColor(value) ? value : undefined;
}

/** 自定义色优先；未设置或非法时回落到预设键。 */
export function accentHex(key: AccentKey, custom?: string): string {
  return safeHexColor(custom) ?? ACCENTS[safeAccent(key)].brand;
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const DARK_SURFACE: RGB = [31, 41, 55];

/**
 * 由主色推导出配套的三档色：
 * - brand：主色本身（用于按钮、强调）；
 * - soft / deep：浅色底与深色字（浅色模式下的柔和搭配）；
 * - softDark / deepDark：深色模式下的对应搭配，保证可读与对比。
 * 全部以 "r g b" 形式返回，供 CSS 变量 + Tailwind rgb(var() / <alpha>) 使用。
 */
export function accentVars(key: AccentKey, custom?: string): {
  brand: string;
  soft: string;
  deep: string;
  softDark: string;
  deepDark: string;
  hex: string;
} {
  const hex = accentHex(key, custom);
  const brand = hexToRgb(hex);
  return {
    brand: `${brand[0]} ${brand[1]} ${brand[2]}`,
    soft: `${mix(brand, WHITE, 0.88).join(' ')}`,
    deep: `${mix(brand, BLACK, 0.18).join(' ')}`,
    softDark: `${mix(brand, DARK_SURFACE, 0.82).join(' ')}`,
    deepDark: `${mix(brand, WHITE, 0.3).join(' ')}`,
    hex,
  };
}

/** 把强调色写入根节点的 CSS 变量，整站主题色随之切换。 */
export function applyAccent(key: AccentKey, custom?: string): void {
  if (typeof document === 'undefined') return;
  const vars = accentVars(key, custom);
  const root = document.documentElement.style;
  root.setProperty('--tp-brand', vars.brand);
  root.setProperty('--tp-brand-soft', vars.soft);
  root.setProperty('--tp-brand-deep', vars.deep);
  root.setProperty('--tp-brand-soft-dark', vars.softDark);
  root.setProperty('--tp-brand-deep-dark', vars.deepDark);
  root.setProperty('--tp-brand-hex', vars.hex);
}
