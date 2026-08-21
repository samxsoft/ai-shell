import { reactive, watch } from 'vue';
import type { UserSettings } from '@/types';
import { useI18n } from '@/composables/useI18n';

const STORAGE_KEY = 'ai_shell_user_settings_v1';

const defaultSettings: UserSettings = {
  aiProvider: 'deepseek',
  apiKey: '',
  apiEndpoint: 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat',
  ollamaDetected: false,
  autoDiagnosticOnStartup: false,
  requireConfirmForDangerousActions: true,
  theme: 'dark',
  language: 'system',
};

const providerDefaults: Record<UserSettings['aiProvider'], { endpoint: string; model: string }> = {
  deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  ollama: { endpoint: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('读取本地配置失败:', e);
  }
  return { ...defaultSettings };
}

// 全局单例响应式 settings
const settings = reactive<UserSettings>(loadSettings());

// 应用主题到 DOM
export function applyTheme(theme: UserSettings['theme']) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  let resolvedTheme = theme;
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedTheme = isDark ? 'dark' : 'light';
  }

  if (resolvedTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }
}

// 监听系统色彩偏好变化
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
  // 初始化应用主题与语言
  applyTheme(settings.theme || 'dark');
  useI18n().setLanguage(settings.language || 'system');
}

// 自动保存与主题/语言同步
watch(
  settings,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch (e) {
      console.warn('保存配置到 localStorage 失败:', e);
    }
    applyTheme(val.theme || 'dark');
    useI18n().setLanguage(val.language || 'system');
  },
  { deep: true }
);

export function useSettings() {
  const switchProvider = (providerId: UserSettings['aiProvider']) => {
    settings.aiProvider = providerId;
    if (providerDefaults[providerId]) {
      settings.apiEndpoint = providerDefaults[providerId].endpoint;
      settings.modelName = providerDefaults[providerId].model;
    }
  };

  const hasConfiguredApiKey = () => {
    if (settings.aiProvider === 'ollama') return true;
    return Boolean(settings.apiKey && settings.apiKey.trim().length > 5);
  };

  const setTheme = (theme: UserSettings['theme']) => {
    settings.theme = theme;
  };

  const setLanguage = (lang: NonNullable<UserSettings['language']>) => {
    settings.language = lang;
  };

  const toggleTheme = () => {
    if (settings.theme === 'dark') {
      settings.theme = 'light';
    } else {
      settings.theme = 'dark';
    }
  };

  return {
    settings,
    switchProvider,
    hasConfiguredApiKey,
    setTheme,
    setLanguage,
    toggleTheme,
    applyTheme,
  };
}

