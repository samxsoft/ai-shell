<template>
  <div class="h-full overflow-y-auto p-6 max-w-4xl space-y-6">
    <!-- Model Provider Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Bot class="w-4 h-4 text-blue-400" />
            <span>{{ t('settings.aiTitle') }}</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('settings.aiDesc') }}</p>
        </div>

        <span
          class="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
          :class="isTesting ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : (hasConfiguredApiKey() ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700')"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="isTesting ? 'bg-amber-400 animate-ping' : (hasConfiguredApiKey() ? 'bg-emerald-400' : 'bg-slate-500')"></span>
          {{ isTesting ? t('settings.testing') : (hasConfiguredApiKey() ? (locale === 'zh-CN' ? '已配置 (支持真实推理)' : 'Configured (Live AI Ready)') : (locale === 'zh-CN' ? '未配置 (演示模式)' : 'Not Configured (Demo Mode)')) }}
        </span>
      </div>

      <!-- Provider Radio Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        <div
          v-for="provider in providers"
          :key="provider.id"
          @click="switchProvider(provider.id as any)"
          class="p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between"
          :class="settings.aiProvider === provider.id ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="font-medium text-xs text-slate-200">{{ provider.name }}</div>
            <span v-if="provider.tag" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {{ provider.tag }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 leading-snug">{{ provider.desc }}</div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div class="space-y-3 pt-2">
        <div v-if="settings.aiProvider !== 'ollama'">
          <label class="block text-xs font-medium text-slate-300 mb-1">{{ t('settings.apiKeyLabel') }}</label>
          <input
            v-model="settings.apiKey"
            type="password"
            :placeholder="t('settings.apiKeyPlaceholder')"
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">{{ t('settings.endpointLabel') }}</label>
            <input
              v-model="settings.apiEndpoint"
              type="text"
              placeholder="https://api.deepseek.com/v1"
              class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono text-slate-300"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">{{ t('settings.modelLabel') }}</label>
            <input
              v-model="settings.modelName"
              type="text"
              placeholder="deepseek-chat"
              class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono text-slate-300"
            />
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button
            @click="handleTestConnection"
            :disabled="isTesting"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isTesting" class="w-3.5 h-3.5 animate-spin" />
            <Sparkles v-else class="w-3.5 h-3.5 text-blue-400" />
            <span>{{ t('settings.testConnection') }}</span>
          </button>

          <span
            v-if="testResult"
            class="text-xs flex items-center gap-1 font-mono"
            :class="testSuccess ? 'text-emerald-400' : 'text-rose-400'"
          >
            <Check v-if="testSuccess" class="w-3.5 h-3.5" />
            <AlertCircle v-else class="w-3.5 h-3.5" />
            {{ testResult }}
          </span>
        </div>
      </div>
    </div>

    <!-- Local GGUF Model Hub Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Box class="w-4 h-4 text-emerald-400" />
            <span>{{ t('settings.modelHub.title') }}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              GGUF & OpenWALDO
            </span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('settings.modelHub.subtitle') }}</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openModelsFolder"
            class="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            :title="t('settings.modelHub.openDir')"
          >
            <FolderOpen class="w-3.5 h-3.5 text-blue-400" />
            <span>{{ t('settings.modelHub.openDir') }}</span>
          </button>

          <button
            @click="fetchModels"
            :disabled="isLoadingModels"
            class="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            :title="t('settings.modelHub.refreshList')"
          >
            <RefreshCw class="w-3.5 h-3.5 text-slate-400" :class="{ 'animate-spin': isLoadingModels }" />
            <span>{{ t('settings.modelHub.refreshList') }}</span>
          </button>
        </div>
      </div>

      <!-- Models List Grid -->
      <div class="grid grid-cols-1 gap-3 pt-1">
        <div
          v-for="model in localModels"
          :key="model.id"
          class="p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden"
          :class="model.isActive ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30' : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'"
        >
          <!-- Top Row: Name, Tags, Badges -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                <Cpu class="w-3.5 h-3.5 text-emerald-400" />
                <span>{{ model.name }}</span>
              </div>

              <span
                v-if="model.isWaldoCertified"
                class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1"
                :title="t('settings.modelHub.waldoTooltip')"
              >
                {{ t('settings.modelHub.waldoTag') }}
              </span>

              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                {{ model.quantization }}
              </span>

              <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                {{ model.formattedSize }}
              </span>

              <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                RAM {{ model.ramRequired }}
              </span>

              <span
                v-if="model.isActive"
                class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40"
              >
                {{ t('settings.modelHub.activeTag') }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- Download Button -->
              <button
                v-if="model.status === 'not_downloaded' || model.status === 'error'"
                @click="startDownload(model.id)"
                class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <Download class="w-3.5 h-3.5" />
                <span>{{ t('settings.modelHub.btnDownload') }}</span>
              </button>

              <!-- Cancel Button -->
              <button
                v-else-if="model.status === 'downloading'"
                @click="cancelDownload(model.id)"
                class="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <X class="w-3.5 h-3.5" />
                <span>{{ t('settings.modelHub.btnCancel') }}</span>
              </button>

              <!-- Downloaded Status & Set Active / In-Memory Load / Delete Buttons -->
              <template v-else-if="model.status === 'downloaded'">
                <!-- Load / Unload from RAM -->
                <button
                  v-if="engineStatus.modelId === model.id"
                  @click="unloadModel"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                  :title="t('settings.modelHub.btnUnloadRam')"
                >
                  <Cpu class="w-3.5 h-3.5 text-emerald-400" />
                  <span>{{ t('settings.modelHub.ramLoadedTag') }}</span>
                </button>

                <button
                  v-else
                  @click="handleLoadModelToRam(model.id)"
                  :disabled="isLoadingInference"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  :title="t('settings.modelHub.btnLoadToRam')"
                >
                  <Loader2 v-if="isLoadingInference && targetLoadingId === model.id" class="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <Cpu v-else class="w-3.5 h-3.5 text-slate-400" />
                  <span>{{ t('settings.modelHub.btnLoadToRam') }}</span>
                </button>

                <button
                  v-if="!model.isActive"
                  @click="setActiveModel(model.id)"
                  class="px-2 py-1 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <CheckCircle2 class="w-3.5 h-3.5 text-slate-400" />
                  <span>{{ t('settings.modelHub.btnSetActive') }}</span>
                </button>

                <button
                  @click="deleteModel(model.id)"
                  class="px-2 py-1 rounded-lg text-xs font-medium bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  :title="t('settings.modelHub.btnDelete')"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </template>
            </div>
          </div>

          <!-- Description -->
          <div class="text-[11px] text-slate-400 leading-relaxed mb-2">{{ model.description }}</div>

          <!-- Downloading Progress Bar & Speed Display -->
          <div v-if="model.status === 'downloading'" class="mt-2 space-y-1.5 pt-2 border-t border-slate-800/60">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-emerald-400 flex items-center gap-1.5">
                <Loader2 class="w-3 h-3 animate-spin" />
                <span>{{ t('settings.modelHub.statusDownloading') }} {{ model.progressPercent.toFixed(1) }}%</span>
              </span>
              <div class="flex items-center gap-3 text-slate-400 text-[10px]">
                <span>{{ t('settings.modelHub.speedLabel') }}: <strong class="text-slate-200">{{ model.formattedSpeed }}</strong></span>
                <span v-if="model.etaSeconds > 0">{{ t('settings.modelHub.etaLabel') }}: <strong class="text-slate-200">{{ model.etaSeconds }}{{ t('settings.modelHub.secondsUnit') }}</strong></span>
              </div>
            </div>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                :style="{ width: `${Math.max(2, model.progressPercent)}%` }"
              ></div>
            </div>
          </div>

          <!-- Error Alert if any -->
          <div v-if="model.status === 'error' && model.errorMsg" class="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
            <AlertCircle class="w-3.5 h-3.5 flex-shrink-0" />
            <span>{{ model.errorMsg }}</span>
          </div>
        </div>
      </div>

      <!-- Storage Footer Hint -->
      <div class="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5">
        <Info class="w-3.5 h-3.5 text-slate-500" />
        <span>{{ t('settings.modelHub.storageHint') }}</span>
      </div>
    </div>

    <!-- Language Preferences Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Languages class="w-4 h-4 text-blue-400" />
            <span>{{ t('settings.langTitle') }}</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('settings.langDesc') }}</p>
        </div>

        <span class="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
          {{ currentLangLabel }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div
          v-for="lang in languageOptions"
          :key="lang.id"
          @click="setLanguage(lang.id as any)"
          class="p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group"
          :class="settings.language === lang.id ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-colors"
                :class="settings.language === lang.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'"
              >
                {{ lang.badge }}
              </div>
              <div class="font-medium text-xs text-slate-200">{{ lang.name }}</div>
            </div>
            <span v-if="lang.tag" class="text-[10px] px-1.5 py-0.5 rounded font-medium" :class="settings.language === lang.id ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400 border border-slate-700'">
              {{ lang.tag }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 leading-snug">{{ lang.desc }}</div>
        </div>
      </div>
    </div>

    <!-- Appearance & Theme Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Palette class="w-4 h-4 text-purple-400" />
            <span>{{ t('settings.themeTitle') }}</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('settings.themeDesc') }}</p>
        </div>

        <span class="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
          {{ currentThemeLabel }}
        </span>
      </div>

      <!-- Theme Selection Radio Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div
          v-for="th in themeOptions"
          :key="th.id"
          @click="setTheme(th.id as any)"
          class="p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group"
          :class="settings.theme === th.id ? 'bg-purple-600/15 border-purple-500/50 shadow-sm shadow-purple-500/10 ring-1 ring-purple-500/30' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                :class="settings.theme === th.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'"
              >
                <component :is="th.icon" class="w-4 h-4" />
              </div>
              <div class="font-medium text-xs text-slate-200">{{ th.name }}</div>
            </div>
            <span v-if="th.tag" class="text-[10px] px-1.5 py-0.5 rounded font-medium" :class="settings.theme === th.id ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400 border border-slate-700'">
              {{ th.tag }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 leading-snug">{{ th.desc }}</div>
        </div>
      </div>
    </div>

    <!-- Security & Guardrails -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
        <Shield class="w-4 h-4 text-emerald-400" />
        <span>{{ t('settings.securityTitle') }}</span>
      </h3>
      <p class="text-xs text-slate-400 -mt-2">{{ t('settings.securityDesc') }}</p>

      <div class="space-y-3 divide-y divide-slate-800/60 text-xs">
        <div class="flex items-center justify-between pt-2">
          <div>
            <div class="font-medium text-slate-200">{{ t('settings.confirmDangerousTitle') }}</div>
            <div class="text-slate-500 text-[11px] mt-0.5">{{ t('settings.confirmDangerousDesc') }}</div>
          </div>
          <input
            v-model="settings.requireConfirmForDangerousActions"
            type="checkbox"
            class="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        </div>

        <div class="flex items-center justify-between pt-3">
          <div>
            <div class="font-medium text-slate-200">{{ t('settings.silentProbeTitle') }}</div>
            <div class="text-slate-500 text-[11px] mt-0.5">{{ t('settings.silentProbeDesc') }}</div>
          </div>
          <input type="checkbox" checked class="w-4 h-4 accent-blue-600 cursor-pointer" />
        </div>

        <div class="flex items-center justify-between pt-3">
          <div>
            <div class="font-medium text-slate-200">{{ t('settings.blacklistTitle') }}</div>
            <div class="text-slate-500 text-[11px] mt-0.5">{{ t('settings.blacklistDesc') }}</div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">{{ t('settings.alwaysOn') }}</span>
        </div>
      </div>
    </div>

    <!-- 关于与系统版本 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Info class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-100">{{ t('settings.aboutTitle') }}</h2>
          <p class="text-xs text-slate-400">{{ t('settings.aboutSubtitle') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div class="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div class="text-[11px] text-slate-400 mb-1">{{ t('settings.currentVersion') }}</div>
          <div class="text-sm font-semibold font-mono text-blue-400">v{{ version }}</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div class="text-[11px] text-slate-400 mb-1">{{ t('settings.engine') }}</div>
          <div class="text-sm font-semibold text-slate-200">{{ t('settings.engineValue') }}</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div class="text-[11px] text-slate-400 mb-1">{{ t('settings.runtime') }}</div>
          <div class="text-sm font-semibold text-slate-200">{{ t('settings.runtimeValue') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Bot,
  Shield,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Palette,
  Moon,
  Sun,
  Monitor,
  Info,
  Languages,
  Box,
  FolderOpen,
  RefreshCw,
  Download,
  X,
  CheckCircle2,
  Trash2,
  Cpu,
} from 'lucide-vue-next';
import { useSettings } from '@/composables/useSettings';
import { useAppInfo } from '@/composables/useAppInfo';
import { useI18n } from '@/composables/useI18n';
import { useModelHub } from '@/composables/useModelHub';
import { useInferenceEngine } from '@/composables/useInferenceEngine';
import { testAiConnection } from '@/services/aiClient';

const { settings, switchProvider, hasConfiguredApiKey, setTheme, setLanguage } = useSettings();
const { version } = useAppInfo();
const { t, locale } = useI18n();
const {
  models: localModels,
  isLoading: isLoadingModels,
  fetchModels,
  startDownload,
  cancelDownload,
  deleteModel,
  setActiveModel,
  openModelsFolder,
} = useModelHub();

const {
  engineStatus,
  isLoading: isLoadingInference,
  loadModel,
  unloadModel,
} = useInferenceEngine();

const targetLoadingId = ref<string | null>(null);

const handleLoadModelToRam = async (modelId: string) => {
  targetLoadingId.value = modelId;
  await loadModel(modelId);
  await setActiveModel(modelId);
  switchProvider('local_embedded');
  targetLoadingId.value = null;
};

const isTesting = ref(false);
const testSuccess = ref(false);
const testResult = ref('');

const currentLangLabel = computed(() => {
  if (settings.language === 'zh-CN') return t('settings.langZhOption');
  if (settings.language === 'en-US') return t('settings.langEnOption');
  return `${t('settings.langSystemOption')} (${locale.value === 'zh-CN' ? '中文' : 'EN'})`;
});

const currentThemeLabel = computed(() => {
  if (settings.theme === 'dark') return t('settings.themeDark');
  if (settings.theme === 'light') return t('settings.themeLight');
  return t('settings.themeSystem');
});

const languageOptions = computed(() => [
  {
    id: 'zh-CN',
    name: '简体中文',
    badge: 'ZH',
    tag: locale.value === 'zh-CN' ? '推荐' : 'Default',
    desc: t('settings.languages.zhDesc'),
  },
  {
    id: 'en-US',
    name: 'English (US)',
    badge: 'EN',
    tag: 'Global',
    desc: t('settings.languages.enDesc'),
  },
  {
    id: 'system',
    name: t('settings.langSystemOption'),
    badge: 'AUTO',
    tag: 'Auto',
    desc: t('settings.languages.systemDesc'),
  },
]);

const themeOptions = computed(() => [
  {
    id: 'dark',
    name: t('settings.themeDark'),
    tag: 'Classic',
    icon: Moon,
    desc: t('settings.themeDarkDesc'),
  },
  {
    id: 'light',
    name: t('settings.themeLight'),
    tag: 'New',
    icon: Sun,
    desc: t('settings.themeLightDesc'),
  },
  {
    id: 'system',
    name: t('settings.themeSystem'),
    tag: 'Auto',
    icon: Monitor,
    desc: t('settings.themeSystemDesc'),
  },
]);

const providers = computed(() => [
  {
    id: 'deepseek',
    name: t('settings.providers.deepseek.name'),
    tag: t('settings.providers.deepseek.tag'),
    desc: t('settings.providers.deepseek.desc'),
  },
  {
    id: 'local_embedded',
    name: t('settings.providers.local_embedded.name'),
    tag: t('settings.providers.local_embedded.tag'),
    desc: t('settings.providers.local_embedded.desc'),
  },
  {
    id: 'openwaldo',
    name: t('settings.providers.openwaldo.name'),
    tag: t('settings.providers.openwaldo.tag'),
    desc: t('settings.providers.openwaldo.desc'),
  },
  {
    id: 'ollama',
    name: t('settings.providers.ollama.name'),
    tag: t('settings.providers.ollama.tag'),
    desc: t('settings.providers.ollama.desc'),
  },
  {
    id: 'qwen',
    name: t('settings.providers.qwen.name'),
    tag: t('settings.providers.qwen.tag'),
    desc: t('settings.providers.qwen.desc'),
  },
  {
    id: 'openai',
    name: t('settings.providers.openai.name'),
    tag: t('settings.providers.openai.tag'),
    desc: t('settings.providers.openai.desc'),
  },
  {
    id: 'claude',
    name: t('settings.providers.claude.name'),
    tag: t('settings.providers.claude.tag'),
    desc: t('settings.providers.claude.desc'),
  },
]);

const handleTestConnection = async () => {
  isTesting.value = true;
  testResult.value = '';
  const res = await testAiConnection(settings);
  isTesting.value = false;
  testSuccess.value = res.success;
  testResult.value = res.message;
};
</script>


