import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface ModelItem {
  id: string;
  name: string;
  description: string;
  parameterSize: string;
  sizeBytes: number;
  formattedSize: string;
  ramRequired: string;
  quantization: string;
  downloadUrl: string;
  filename: string;
  isWaldoCertified: boolean;
  status: 'not_downloaded' | 'downloading' | 'downloaded' | 'paused' | 'error';
  downloadedBytes: number;
  progressPercent: number;
  formattedSpeed: string;
  etaSeconds: number;
  isActive: boolean;
  localPath?: string;
  errorMsg?: string;
}

export interface ModelDownloadProgressPayload {
  modelId: string;
  status: 'not_downloaded' | 'downloading' | 'downloaded' | 'paused' | 'error';
  downloadedBytes: number;
  totalBytes: number;
  progressPercent: number;
  formattedSpeed: string;
  etaSeconds: number;
  errorMsg?: string;
}

const mockPresets: ModelItem[] = [
  {
    id: 'openwaldo-base-1.5b-q4',
    name: 'OpenWALDO 1.5B (True Open Source)',
    description: '100% auditable open dataset, open weights & training recipes certified by the OpenWALDO community.',
    parameterSize: '1.5B',
    sizeBytes: 980_000_000,
    formattedSize: '980 MB',
    ramRequired: '~1.5 GB',
    quantization: 'Q4_K_M',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    filename: 'openwaldo-1.5b-q4_k_m.gguf',
    isWaldoCertified: true,
    status: 'not_downloaded',
    downloadedBytes: 0,
    progressPercent: 0,
    formattedSpeed: '0 MB/s',
    etaSeconds: 0,
    isActive: false,
  },
  {
    id: 'qwen2.5-0.5b-instruct-q4',
    name: 'Qwen2.5-Coder 0.5B (Ultra-Light)',
    description: 'Sub-400MB lightning-fast local model. Ideal for instant CPU diagnosis on resource-constrained devices.',
    parameterSize: '0.5B',
    sizeBytes: 398_000_000,
    formattedSize: '398 MB',
    ramRequired: '~0.8 GB',
    quantization: 'Q4_K_M',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
    isWaldoCertified: false,
    status: 'not_downloaded',
    downloadedBytes: 0,
    progressPercent: 0,
    formattedSpeed: '0 MB/s',
    etaSeconds: 0,
    isActive: false,
  },
  {
    id: 'qwen2.5-1.5b-instruct-q4',
    name: 'Qwen2.5-Coder 1.5B (Recommended)',
    description: 'Balanced speed & deep system diagnostic reasoning. Low memory footprint with strong script analysis.',
    parameterSize: '1.5B',
    sizeBytes: 1_120_000_000,
    formattedSize: '1.12 GB',
    ramRequired: '~1.8 GB',
    quantization: 'Q4_K_M',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    isWaldoCertified: false,
    status: 'downloaded',
    downloadedBytes: 1_120_000_000,
    progressPercent: 100,
    formattedSpeed: 'Ready',
    etaSeconds: 0,
    isActive: true,
  },
  {
    id: 'llama-3.2-1b-instruct-q4',
    name: 'Llama-3.2 1B Instruct (Fast Generalist)',
    description: "Meta's latest lightweight compact model optimized for edge devices and fast conversational troubleshooting.",
    parameterSize: '1B',
    sizeBytes: 815_000_000,
    formattedSize: '815 MB',
    ramRequired: '~1.2 GB',
    quantization: 'Q4_K_M',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    isWaldoCertified: false,
    status: 'not_downloaded',
    downloadedBytes: 0,
    progressPercent: 0,
    formattedSpeed: '0 MB/s',
    etaSeconds: 0,
    isActive: false,
  },
  {
    id: 'qwen2.5-3b-instruct-q4',
    name: 'Qwen2.5 3B Instruct (Power Diagnostic)',
    description: 'High-precision code and root-cause analysis with deep multi-step ActionCard execution planning.',
    parameterSize: '3B',
    sizeBytes: 2_150_000_000,
    formattedSize: '2.15 GB',
    ramRequired: '~3.2 GB',
    quantization: 'Q4_K_M',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    isWaldoCertified: false,
    status: 'not_downloaded',
    downloadedBytes: 0,
    progressPercent: 0,
    formattedSpeed: '0 MB/s',
    etaSeconds: 0,
    isActive: false,
  },
];

export function useModelHub() {
  const models = ref<ModelItem[]>([]);
  const isLoading = ref(false);
  const activeModelId = ref<string | null>(null);
  let unlisten: UnlistenFn | null = null;

  const fetchModels = async () => {
    isLoading.value = true;
    try {
      const res = await invoke<ModelItem[]>('get_model_catalog');
      if (res && Array.isArray(res) && res.length > 0) {
        models.value = res;
        const active = res.find((m) => m.isActive);
        activeModelId.value = active ? active.id : null;
      } else {
        models.value = mockPresets;
      }
    } catch (e) {
      console.warn('Tauri get_model_catalog failed, using presets:', e);
      models.value = mockPresets;
    } finally {
      isLoading.value = false;
    }
  };

  const startDownload = async (modelId: string) => {
    const target = models.value.find((m) => m.id === modelId);
    if (target) {
      target.status = 'downloading';
      target.progressPercent = 0.5;
      target.formattedSpeed = 'Connecting...';
    }
    try {
      await invoke('download_local_model', { modelId });
    } catch (e: any) {
      console.error('Failed to start download:', e);
      if (target) {
        target.status = 'error';
        target.errorMsg = String(e);
      }
    }
  };

  const cancelDownload = async (modelId: string) => {
    const target = models.value.find((m) => m.id === modelId);
    if (target) {
      target.status = 'not_downloaded';
      target.progressPercent = 0;
      target.downloadedBytes = 0;
    }
    try {
      await invoke('cancel_model_download', { modelId });
    } catch (e) {
      console.error('Failed to cancel download:', e);
    }
  };

  const deleteModel = async (modelId: string) => {
    const target = models.value.find((m) => m.id === modelId);
    if (target) {
      target.status = 'not_downloaded';
      target.progressPercent = 0;
      target.downloadedBytes = 0;
      target.isActive = false;
    }
    try {
      await invoke('delete_local_model', { modelId });
    } catch (e) {
      console.error('Failed to delete model:', e);
    }
  };

  const setActiveModel = async (modelId: string) => {
    activeModelId.value = modelId;
    models.value.forEach((m) => {
      m.isActive = m.id === modelId;
    });
    try {
      await invoke('set_active_local_model', { modelId });
    } catch (e) {
      console.error('Failed to set active model:', e);
    }
  };

  const openModelsFolder = async () => {
    try {
      await invoke('open_models_folder');
    } catch (e) {
      console.error('Failed to open models folder:', e);
    }
  };

  onMounted(async () => {
    await fetchModels();
    try {
      unlisten = await listen<ModelDownloadProgressPayload>('model_download_progress', (event) => {
        const payload = event.payload;
        const target = models.value.find((m) => m.id === payload.modelId);
        if (target) {
          target.status = payload.status;
          target.downloadedBytes = payload.downloadedBytes;
          target.progressPercent = payload.progressPercent;
          target.formattedSpeed = payload.formattedSpeed;
          target.etaSeconds = payload.etaSeconds;
          if (payload.errorMsg) {
            target.errorMsg = payload.errorMsg;
          }
        }
      });
    } catch (e) {
      console.warn('Failed to listen to model_download_progress events:', e);
    }
  });

  onUnmounted(() => {
    if (unlisten) {
      unlisten();
    }
  });

  return {
    models,
    isLoading,
    activeModelId,
    fetchModels,
    startDownload,
    cancelDownload,
    deleteModel,
    setActiveModel,
    openModelsFolder,
  };
}
