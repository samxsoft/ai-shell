import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// 编译阶段由 vite.config.ts 从 tauri.conf.json 注入
declare const __APP_VERSION__: string;

const appVersion = ref(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.2.0');
let isInitialized = false;

export function useAppInfo() {
  const fetchVersion = async () => {
    try {
      const v = await invoke<string>('get_app_version');
      if (v) {
        appVersion.value = v;
      }
    } catch {
      // 在浏览器纯预览模式下沿用 __APP_VERSION__
    }
  };

  if (!isInitialized) {
    isInitialized = true;
    fetchVersion();
  }

  onMounted(() => {
    fetchVersion();
  });

  return {
    version: appVersion,
    fetchVersion,
  };
}
