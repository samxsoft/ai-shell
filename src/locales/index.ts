import { zhCN } from './zh-CN';
import { enUS } from './en-US';

export type LocaleType = 'zh-CN' | 'en-US';
export type AppLanguage = 'zh-CN' | 'en-US' | 'system';

export type TranslationSchema = typeof zhCN;

export const messages: Record<LocaleType, TranslationSchema> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
