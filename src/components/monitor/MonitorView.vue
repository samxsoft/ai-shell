<template>
  <div class="h-full overflow-y-auto p-6 space-y-6">
    <!-- Top 4 Metric Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- CPU Metric -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-slate-400">{{ t('sidebar.cpuUsage') }}</span>
          <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Cpu class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ metrics.cpuUsage }}%</span>
          <span class="text-xs text-slate-500">{{ metrics.physicalCores ? t('monitor.physicalCores', metrics.physicalCores) + ' / ' : '' }}{{ t('monitor.cores', metrics.cpuCores || 8) }}</span>
        </div>

        <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="metrics.cpuUsage > 80 ? 'bg-rose-500' : metrics.cpuUsage > 50 ? 'bg-amber-500' : 'bg-blue-500'"
            :style="{ width: `${metrics.cpuUsage}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-500 mt-2">
          <span>{{ t('monitor.cpuTemp', metrics.cpuTemp || 45) }}</span>
          <span>3.6 GHz</span>
        </div>
      </div>

      <!-- Memory Metric -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-slate-400">{{ t('sidebar.memoryUsage') }}</span>
          <div class="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <HardDrive class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ metrics.memoryUsagePercent }}%</span>
          <span class="text-xs text-slate-500">{{ metrics.memoryUsedGB }}GB / {{ metrics.memoryTotalGB }}GB</span>
        </div>
        <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="metrics.memoryUsagePercent > 85 ? 'bg-rose-500' : metrics.memoryUsagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'"
            :style="{ width: `${metrics.memoryUsagePercent}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-500 mt-2">
          <span>{{ locale === 'zh-CN' ? '可用内存: ' : 'Available: ' }}{{ (metrics.memoryTotalGB - metrics.memoryUsedGB).toFixed(1) }} GB</span>
          <span>{{ locale === 'zh-CN' ? '待机缓存: 2.1 GB' : 'Standby: 2.1 GB' }}</span>
        </div>
      </div>

      <!-- Disk Metric -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-slate-400">{{ metrics.primaryDiskName || (locale === 'zh-CN' ? '系统盘 (C:)' : 'System Disk (C:)') }}</span>
          <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Database class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ metrics.diskUsagePercent }}%</span>
          <span class="text-xs text-slate-500">{{ metrics.diskUsedGB }}GB / {{ metrics.diskTotalGB }}GB</span>
        </div>

        <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="metrics.diskUsagePercent > 90 ? 'bg-rose-500' : metrics.diskUsagePercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'"
            :style="{ width: `${metrics.diskUsagePercent}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-500 mt-2">
          <span>{{ locale === 'zh-CN' ? '剩余可用: ' : 'Free Space: ' }}{{ metrics.diskTotalGB - metrics.diskUsedGB }} GB</span>
          <span>NTFS (NVMe)</span>
        </div>
      </div>

      <!-- Network Metric -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-slate-400">{{ locale === 'zh-CN' ? '实时网络流量' : 'Realtime Network' }}</span>
          <div class="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Activity class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ (metrics.networkDownKBps / 1024).toFixed(1) }}</span>
          <span class="text-xs text-slate-500">MB/s {{ t('monitor.networkDownload') }}</span>
        </div>
        <div class="h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
          <div class="h-full bg-sky-500 rounded-full w-2/3"></div>
          <div class="h-full bg-blue-400 rounded-full w-1/3"></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
          <span>↑ {{ t('monitor.networkUpload') }}: {{ metrics.networkUpKBps }} KB/s</span>
          <span>Wi-Fi 6</span>
        </div>
      </div>
    </div>

    <!-- Process Manager Table Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 class="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>{{ t('monitor.topProcesses') }}</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">{{ t('monitor.count', processes.length) }}</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('monitor.topProcessesSub') }}</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Search input -->
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('common.searchPlaceholder')"
              class="bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-200 outline-none w-48 transition-all"
            />
          </div>
        </div>
      </div>

      <!-- Process Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 text-[11px]">
              <th class="pb-2.5 font-medium">{{ t('monitor.processName') }}</th>
              <th class="pb-2.5 font-medium font-mono">{{ t('monitor.pid') }}</th>
              <th class="pb-2.5 font-medium">{{ t('common.status') }}</th>
              <th class="pb-2.5 font-medium font-mono">{{ t('monitor.cpu') }}</th>
              <th class="pb-2.5 font-medium font-mono">{{ t('monitor.memory') }}</th>
              <th class="pb-2.5 font-medium text-right">{{ t('common.action') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="proc in filteredProcesses"
              :key="proc.pid"
              class="hover:bg-slate-800/40 transition-colors group"
            >
              <td class="py-3 pr-4 font-medium text-slate-200 flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Terminal class="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div class="truncate max-w-xs">
                  <div class="font-medium text-slate-200">{{ proc.name }}</div>
                  <div class="text-[10px] text-slate-500 capitalize">{{ proc.category }}</div>
                </div>
              </td>
              <td class="py-3 font-mono text-slate-400">{{ proc.pid }}</td>
              <td class="py-3">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="{
                    'bg-rose-500/15 text-rose-400 border border-rose-500/30': proc.status === 'unresponsive',
                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': proc.status === 'running',
                    'bg-slate-800 text-slate-400': proc.status === 'sleeping',
                  }"
                >
                  {{ proc.status === 'unresponsive' ? '⚠️ Deadlock' : (locale === 'zh-CN' ? '正常运行' : 'Running') }}
                </span>
              </td>
              <td class="py-3 font-mono" :class="proc.cpuPercent > 20 ? 'text-rose-400 font-semibold' : 'text-slate-300'">
                {{ proc.cpuPercent }}%
              </td>
              <td class="py-3 font-mono" :class="proc.memoryMB > 2000 ? 'text-amber-400 font-semibold' : 'text-slate-300'">
                {{ (proc.memoryMB / 1024).toFixed(2) }} GB
              </td>
              <td class="py-3 text-right">
                <button
                  v-if="proc.isSafeToKill"
                  @click="$emit('killProcess', proc.pid)"
                  class="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                >
                  {{ t('monitor.terminate') }}
                </button>
                <span v-else class="text-[10px] text-slate-600 select-none">{{ locale === 'zh-CN' ? '系统受保护' : 'Protected' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Cpu, HardDrive, Database, Activity, Search, Terminal } from 'lucide-vue-next';
import type { SystemMetrics, ProcessItem } from '@/types';
import { useI18n } from '@/composables/useI18n';

const { t, locale } = useI18n();

const props = defineProps<{
  metrics: SystemMetrics;
  processes: ProcessItem[];
}>();

defineEmits<{
  (e: 'killProcess', pid: number): void;
}>();

const searchQuery = ref('');

const filteredProcesses = computed(() => {
  if (!searchQuery.value.trim()) return props.processes;
  const q = searchQuery.value.toLowerCase();
  return props.processes.filter(p => p.name.toLowerCase().includes(q) || p.pid.toString().includes(q));
});
</script>

