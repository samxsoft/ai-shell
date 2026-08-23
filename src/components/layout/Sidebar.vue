<template>
  <aside class="w-64 h-full bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between select-none relative z-10">
    <!-- Logo & Brand Header -->
    <div>
      <div class="p-5 border-b border-slate-800/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/30 flex-shrink-0 group hover:scale-105 transition-transform duration-200">
            <img src="/app-icon.png" alt="AI-Shell Logo" class="w-full h-full object-cover" />
          </div>
          <div>
            <h1 class="text-sm font-semibold text-slate-100 tracking-wide flex items-center gap-1.5">
              AI-Shell
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-medium border border-blue-500/20">v{{ version }}</span>
            </h1>
            <p class="text-[11px] text-slate-400">{{ t('common.appSubtitle') }}</p>
          </div>
        </div>
      </div>


      <!-- Health Score Widget -->
      <div class="p-4 mx-3 my-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-slate-400">{{ t('sidebar.healthScore') }}</span>
          <span
            class="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
            :class="{
              'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': metrics.healthStatus === 'optimal',
              'bg-amber-500/15 text-amber-400 border border-amber-500/30': metrics.healthStatus === 'warning',
              'bg-rose-500/15 text-rose-400 border border-rose-500/30': metrics.healthStatus === 'critical',
            }"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="{
              'bg-emerald-400': metrics.healthStatus === 'optimal',
              'bg-amber-400': metrics.healthStatus === 'warning',
              'bg-rose-400': metrics.healthStatus === 'critical',
            }"></span>
            {{ metrics.healthStatus === 'optimal' ? t('common.optimal') : metrics.healthStatus === 'warning' ? t('common.warningStatus') : t('common.critical') }}
          </span>
        </div>

        <div class="flex items-baseline gap-2 mb-3">
          <span class="text-3xl font-bold font-mono tracking-tight" :class="{
            'text-emerald-400': metrics.healthStatus === 'optimal',
            'text-amber-400': metrics.healthStatus === 'warning',
            'text-rose-400': metrics.healthStatus === 'critical',
          }">{{ metrics.healthScore }}</span>
          <span class="text-xs text-slate-500">/ 100 {{ t('sidebar.points') }}</span>
        </div>

        <!-- Mini Bars -->
        <div class="space-y-1.5 text-[11px]">
          <div>
            <div class="flex justify-between text-slate-400 mb-1">
              <span>{{ t('sidebar.cpuUsage') }}</span>
              <span class="font-mono">{{ metrics.cpuUsage }}%</span>
            </div>
            <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="metrics.cpuUsage > 80 ? 'bg-rose-500' : metrics.cpuUsage > 50 ? 'bg-amber-500' : 'bg-blue-500'"
                :style="{ width: `${metrics.cpuUsage}%` }"
              ></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-slate-400 mb-1">
              <span>{{ t('sidebar.memoryUsage') }}</span>
              <span class="font-mono">{{ metrics.memoryUsedGB }}GB / {{ metrics.memoryTotalGB }}GB</span>
            </div>
            <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="metrics.memoryUsagePercent > 85 ? 'bg-rose-500' : metrics.memoryUsagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'"
                :style="{ width: `${metrics.memoryUsagePercent}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="px-3 space-y-1">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="$emit('update:activeTab', item.id)"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer"
          :class="activeTab === item.id 
            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'"
        >
          <div class="flex items-center gap-3">
            <component :is="item.icon" class="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>{{ item.label }}</span>
          </div>
          <span v-if="item.badge" class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Active AI Engine Badge Footer -->
    <div class="p-3 m-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span class="text-xs font-medium text-slate-300">{{ activeProviderInfo.name }}</span>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-md font-mono border" :class="activeProviderInfo.badgeClass">
          {{ activeProviderInfo.badge }}
        </span>
      </div>
      <div class="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
        <span class="text-[11px] text-slate-400 flex items-center gap-1">
          <Cpu class="w-3 h-3 text-slate-400" />
          {{ t('sidebar.engineRunning') }}
        </span>
        <span class="text-[10px] text-slate-500 font-mono truncate max-w-[80px]" :title="settings.modelName">
          {{ settings.modelName }}
        </span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, Activity, Wrench, Settings, Cpu } from 'lucide-vue-next';
import type { NavTab, SystemMetrics } from '@/types';

import { useSettings } from '@/composables/useSettings';
import { useAppInfo } from '@/composables/useAppInfo';
import { useI18n } from '@/composables/useI18n';

defineProps<{
  activeTab: NavTab;
  metrics: SystemMetrics;
}>();

defineEmits<{
  (e: 'update:activeTab', tab: NavTab): void;
}>();

const { settings } = useSettings();
const { version } = useAppInfo();
const { t } = useI18n();

const providerConfigs = {
  deepseek: {
    name: 'DeepSeek',
    badge: 'DeepSeek V3',
    badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  },
  ollama: {
    name: 'Ollama',
    badge: 'Local Ollama',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  qwen: {
    name: 'Qwen',
    badge: 'DashScope',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  openai: {
    name: 'OpenAI',
    badge: 'GPT-4o',
    badgeClass: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  },
  claude: {
    name: 'Claude',
    badge: 'Claude 3.5',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  openwaldo: {
    name: 'OpenWALDO',
    badge: 'True Open AI',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20',
  },
  local_embedded: {
    name: 'Rust Embedded',
    badge: '100% Offline GGUF',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-500/20',
  },
};

const activeProviderInfo = computed(() => {
  const p = settings.aiProvider || 'deepseek';
  return providerConfigs[p] || {
    name: p.toUpperCase(),
    badge: p,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };
});

const navItems = computed(() => [
  { id: 'chat' as NavTab, label: t('nav.chat'), icon: MessageSquare, badge: t('nav.aiBadge') },
  { id: 'monitor' as NavTab, label: t('nav.monitor'), icon: Activity },
  { id: 'toolbox' as NavTab, label: t('nav.toolbox'), icon: Wrench, badge: t('nav.toolsCountBadge') },
  { id: 'settings' as NavTab, label: t('nav.settings'), icon: Settings },
]);
</script>
