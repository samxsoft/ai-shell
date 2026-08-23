import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface InferenceStatus {
  modelId: string | null;
  modelName: string | null;
  status: 'unloaded' | 'loading' | 'ready' | 'generating' | 'error';
  ramUsedMb: number;
  deviceType: string;
  contextLength: number;
  loadedAt?: string;
  errorMsg?: string;
}

export interface InferenceTokenPayload {
  token: string;
  isFinished: boolean;
  totalTokens: number;
  elapsedMs: number;
  error?: string;
}

const engineStatus = ref<InferenceStatus>({
  modelId: null,
  modelName: null,
  status: 'unloaded',
  ramUsedMb: 0,
  deviceType: 'CPU (AVX2/DirectCompute)',
  contextLength: 4096,
});

let tokenUnlisten: UnlistenFn | null = null;
let currentTokenCallback: ((token: string) => void) | null = null;
let currentCompleteCallback: (() => void) | null = null;
let currentErrorCallback: ((err: string) => void) | null = null;

export function useInferenceEngine() {
  const isLoading = ref(false);

  const fetchStatus = async () => {
    try {
      const res = await invoke<InferenceStatus>('get_local_inference_status');
      if (res) {
        engineStatus.value = res;
      }
    } catch (e) {
      console.warn('Failed to fetch inference status from Tauri:', e);
    }
  };

  const loadModel = async (modelId: string) => {
    isLoading.value = true;
    engineStatus.value.status = 'loading';
    try {
      const res = await invoke<InferenceStatus>('load_local_model', { modelId });
      if (res) {
        engineStatus.value = res;
      }
    } catch (e: any) {
      console.error('Failed to load local model:', e);
      engineStatus.value.status = 'error';
      engineStatus.value.errorMsg = String(e);
    } finally {
      isLoading.value = false;
    }
  };

  const unloadModel = async () => {
    isLoading.value = true;
    try {
      const res = await invoke<InferenceStatus>('unload_local_model');
      if (res) {
        engineStatus.value = res;
      }
    } catch (e) {
      console.error('Failed to unload model:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const streamLocalCompletion = async (
    prompt: string,
    systemPrompt?: string,
    onToken?: (token: string) => void,
    onComplete?: () => void,
    onError?: (err: string) => void,
  ) => {
    currentTokenCallback = onToken || null;
    currentCompleteCallback = onComplete || null;
    currentErrorCallback = onError || null;

    engineStatus.value.status = 'generating';

    try {
      await invoke('stream_local_completion', {
        prompt,
        systemPrompt: systemPrompt || null,
        maxTokens: 2048,
        temperature: 0.7,
      });
    } catch (e: any) {
      console.error('Error invoking stream_local_completion:', e);
      engineStatus.value.status = 'ready';
      if (currentErrorCallback) {
        currentErrorCallback(String(e));
      }
    }
  };

  const abortCompletion = async () => {
    try {
      await invoke('abort_local_completion');
      engineStatus.value.status = 'ready';
    } catch (e) {
      console.error('Failed to abort completion:', e);
    }
  };

  onMounted(async () => {
    await fetchStatus();
    if (!tokenUnlisten) {
      try {
        tokenUnlisten = await listen<InferenceTokenPayload>('local_token_stream', (event) => {
          const payload = event.payload;
          if (payload.token && currentTokenCallback) {
            currentTokenCallback(payload.token);
          }
          if (payload.error && currentErrorCallback) {
            currentErrorCallback(payload.error);
          }
          if (payload.isFinished) {
            engineStatus.value.status = 'ready';
            if (currentCompleteCallback) {
              currentCompleteCallback();
            }
          }
        });
      } catch (e) {
        console.warn('Failed to listen to local_token_stream:', e);
      }
    }
  });

  return {
    engineStatus,
    isLoading,
    fetchStatus,
    loadModel,
    unloadModel,
    streamLocalCompletion,
    abortCompletion,
  };
}
