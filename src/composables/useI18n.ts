import { ref, computed } from 'vue';
import { messages, type LocaleType, type AppLanguage } from '@/locales';

const currentLocale = ref<LocaleType>('zh-CN');
const languageSetting = ref<AppLanguage>('system');

// 自动检测系统语言
export function detectSystemLocale(): LocaleType {
  if (typeof navigator !== 'undefined') {
    const sysLang = navigator.language || (navigator as any).userLanguage || '';
    if (sysLang.toLowerCase().startsWith('en')) {
      return 'en-US';
    }
  }
  return 'zh-CN';
}

// 解析语言设置得到实际使用的 locale
export function resolveLocale(setting: AppLanguage): LocaleType {
  if (setting === 'system') {
    return detectSystemLocale();
  }
  return setting;
}

// 递归获取嵌套属性
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function useI18n() {
  const setLanguage = (lang: AppLanguage) => {
    languageSetting.value = lang;
    currentLocale.value = resolveLocale(lang);
  };

  const t = (key: string, ...args: (string | number | undefined | null)[]): string => {
    const currentDict = messages[currentLocale.value] || messages['zh-CN'];
    let text = getNestedValue(currentDict, key);

    // Fallback to zh-CN if missing in current locale
    if (text === undefined) {
      text = getNestedValue(messages['zh-CN'], key);
    }

    if (text === undefined) {
      return key;
    }

    // 参数插值 {0}, {1}...
    if (args.length > 0) {
      return text.replace(/\{(\d+)\}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        if (argIndex < args.length) {
          const val = args[argIndex];
          return val !== undefined && val !== null ? String(val) : '';
        }
        return match;
      });
    }

    return text;
  };

  return {
    locale: computed(() => currentLocale.value),
    languageSetting: computed(() => languageSetting.value),
    setLanguage,
    t,
    messages: computed(() => messages[currentLocale.value]),
  };
}
