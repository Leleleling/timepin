import type { Dictionary } from './i18n';
import { zh as zhBase } from './dictionaries.zh';
import { en as enBase } from './dictionaries.en';
import { zhFeature } from './dictionaries.feature.zh';
import { enFeature } from './dictionaries.feature.en';

/** 合并基础文案与新增功能文案；保持 zh / en 具名导出，组件取词路径不变。 */
export const zh: Dictionary = { ...zhBase, ...zhFeature };
export const en: Dictionary = { ...enBase, ...enFeature };
