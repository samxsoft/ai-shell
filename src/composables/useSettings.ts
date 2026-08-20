import { reactive, watch } from 'vue';
import type { UserSettings } from '@/types';

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

// 自动保存
watch(
  settings,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch (e) {
      console.warn('保存配置到 localStorage 失败:', e);
    }
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

  return {
    settings,
    switchProvider,
    hasConfiguredApiKey,
  };
}
