<template>
  <header
    data-tauri-drag-region
    @mousedown="handleDrag"
    @dblclick="handleDoubleClick"
    class="h-12 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 flex items-center justify-between z-20 select-none cursor-default"
  >
    <!-- Left view title & quick stats -->
    <div data-tauri-drag-region class="flex items-center gap-3">
      <h2 class="text-xs font-semibold text-slate-200 flex items-center gap-1.5 pointer-events-none">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        <span>{{ viewTitles[activeTab] }}</span>
      </h2>
      <span class="text-xs text-slate-600 pointer-events-none">|</span>
      <div class="flex items-center gap-2 text-xs text-slate-400 pointer-events-none">
        <span class="flex items-center gap-1 font-mono">
          <Cpu class="w-3.5 h-3.5 text-blue-400" />
          {{ metrics.cpuUsage }}%
        </span>
        <span class="text-slate-600">•</span>
        <span class="flex items-center gap-1 font-mono">
          <HardDrive class="w-3.5 h-3.5 text-indigo-400" />
          {{ metrics.memoryUsagePercent }}% 内存
        </span>
        <span class="text-slate-600">•</span>
        <span class="flex items-center gap-1 font-mono">
          <ArrowDownUp class="w-3.5 h-3.5 text-emerald-400" />
          {{ (metrics.networkDownKBps / 1024).toFixed(1) }} MB/s
        </span>
      </div>
    </div>

    <!-- Center Drag Region -->
    <div data-tauri-drag-region class="flex-1 h-full"></div>

    <!-- Right Actions & Window Controls -->
    <div class="flex items-center gap-2">
      <!-- Quick Check Button -->
      <button
        @click.stop="$emit('quickCheck')"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer mr-1"
      >
        <Sparkles class="w-3 h-3" />
        <span>深度体检</span>
      </button>

      <!-- Theme Switcher Button -->
      <button
        @click.stop="toggleTheme"
        :title="settings.theme === 'dark' ? '当前：深色模式 (点击切换浅色)' : settings.theme === 'light' ? '当前：浅色模式 (点击切换深色)' : '当前：跟随系统模式 (点击切换)'"
        class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer"
      >
        <Sun v-if="settings.theme === 'light'" class="w-3.5 h-3.5 text-amber-500 hover:rotate-45 transition-transform" />
        <Moon v-else-if="settings.theme === 'dark'" class="w-3.5 h-3.5 text-blue-400 hover:-rotate-12 transition-transform" />
        <Monitor v-else class="w-3.5 h-3.5 text-emerald-400" />
      </button>

      <!-- Sandbox Shield Badge -->
      <div class="hidden sm:flex items-center gap-1 text-slate-400 text-[11px] font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 mr-2">
        <ShieldCheck class="w-3 h-3 text-emerald-400" />
        <span>托盘守护中</span>
      </div>

      <!-- Window Control Buttons (Minimize, Maximize, Close) -->
      <div class="flex items-center -mr-2">
        <!-- Minimize -->
        <button
          @click.stop="handleMinimize"
          title="最小化"
          class="w-9 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>

        <!-- Maximize / Restore -->
        <button
          @click.stop="handleToggleMaximize"
          title="最大化 / 还原"
          class="w-9 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <Square class="w-3.5 h-3.5" />
        </button>

        <!-- Close to Tray -->
        <button
          @click.stop="handleClose"
          title="最小化到系统托盘"
          class="w-9 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Cpu, HardDrive, ArrowDownUp, Sparkles, ShieldCheck, Minus, Square, X, Sun, Moon, Monitor } from 'lucide-vue-next';
import type { NavTab, SystemMetrics } from '@/types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '@/composables/useSettings';

const { settings, toggleTheme } = useSettings();

defineProps<{
  activeTab: NavTab;
  metrics: SystemMetrics;
}>();

defineEmits<{
  (e: 'quickCheck'): void;
}>();

const viewTitles: Record<NavTab, string> = {
  chat: '智能排障对话 (AI Copilot)',
  monitor: '实时系统性能看板',
  toolbox: '快捷运维与急救工具箱',
  settings: 'AI 模型与安全设置',
};

// 拖拽窗口
const handleDrag = async (e: MouseEvent) => {
  if (e.button === 0 && !(e.target as HTMLElement)?.closest('button, input, a, select')) {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch {
      // ignore
    }
  }
};

// 双击标题栏切换最大化/还原
const handleDoubleClick = async (e: MouseEvent) => {
  if (!(e.target as HTMLElement)?.closest('button, input, a, select')) {
    await handleToggleMaximize();
  }
};

// 最小化 (双保险)
const handleMinimize = async () => {
  try {
    await invoke('app_minimize');
  } catch {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.log('Minimize fallback:', e);
    }
  }
};

// 最大化/还原 (双保险)
const handleToggleMaximize = async () => {
  try {
    await invoke('app_toggle_maximize');
  } catch {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (e) {
      console.log('Toggle maximize fallback:', e);
    }
  }
};

// 关闭/隐藏到托盘 (双保险)
const handleClose = async () => {
  try {
    await invoke('app_close');
  } catch {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.log('Close fallback:', e);
    }
  }
};
</script>
