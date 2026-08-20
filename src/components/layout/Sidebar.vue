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
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-medium border border-blue-500/20">v0.1</span>
            </h1>
            <p class="text-[11px] text-slate-400">智能系统管家</p>
          </div>
        </div>
      </div>


      <!-- Health Score Widget -->
      <div class="p-4 mx-3 my-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-slate-400">系统健康度</span>
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
            {{ metrics.healthStatus === 'optimal' ? '状态极佳' : metrics.healthStatus === 'warning' ? '存在瓶颈' : '严重告警' }}
          </span>
        </div>

        <div class="flex items-baseline gap-2 mb-3">
          <span class="text-3xl font-bold font-mono tracking-tight" :class="{
            'text-emerald-400': metrics.healthStatus === 'optimal',
            'text-amber-400': metrics.healthStatus === 'warning',
            'text-rose-400': metrics.healthStatus === 'critical',
          }">{{ metrics.healthScore }}</span>
          <span class="text-xs text-slate-500">/ 100 分</span>
        </div>

        <!-- Mini Bars -->
        <div class="space-y-1.5 text-[11px]">
          <div>
            <div class="flex justify-between text-slate-400 mb-1">
              <span>CPU 占用</span>
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
              <span>内存占用</span>
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
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
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

    <!-- Footer Status info & Active AI Provider -->
    <div class="p-3 border-t border-slate-800/60">
      <div
        @click="$emit('update:activeTab', 'settings')"
        class="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/30 transition-all cursor-pointer group"
        title="点击前往【设置中心】切换大模型与配置 API Key"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI Agent 引擎</span>
          </div>
          <span
            class="text-[10px] font-mono px-1.5 py-0.5 rounded-full border font-medium"
            :class="activeProviderInfo.badgeClass"
          >
            {{ activeProviderInfo.badge }}
          </span>
        </div>

        <div class="flex items-center justify-between text-[11px]">
          <div class="flex items-center gap-1 text-slate-400 group-hover:text-slate-300 truncate max-w-[170px]">
            <Cpu class="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span class="font-medium truncate">{{ activeProviderInfo.name }}</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono truncate max-w-[80px]" :title="settings.modelName">
            {{ settings.modelName }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, Activity, Wrench, Settings, Cpu } from 'lucide-vue-next';
import type { NavTab, SystemMetrics } from '@/types';

import { useSettings } from '@/composables/useSettings';

defineProps<{
  activeTab: NavTab;
  metrics: SystemMetrics;
}>();

defineEmits<{
  (e: 'update:activeTab', tab: NavTab): void;
}>();

const { settings } = useSettings();

const providerConfigs = {
  deepseek: {
    name: 'DeepSeek',
    badge: 'DeepSeek V3',
    badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  },
  ollama: {
    name: 'Ollama (本地私有)',
    badge: 'Local Ollama',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  qwen: {
    name: '通义千问 Qwen',
    badge: 'DashScope',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  openai: {
    name: 'OpenAI',
    badge: 'GPT-4o',
    badgeClass: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  },
  claude: {
    name: 'Anthropic Claude',
    badge: 'Claude 3.5',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
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

const navItems = [
  { id: 'chat' as NavTab, label: '智能排障对话', icon: MessageSquare, badge: 'AI' },
  { id: 'monitor' as NavTab, label: '实时性能监控', icon: Activity },
  { id: 'toolbox' as NavTab, label: '快捷工具箱', icon: Wrench, badge: '8' },
  { id: 'settings' as NavTab, label: '设置中心', icon: Settings },
];
</script>

