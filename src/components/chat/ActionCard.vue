<template>
  <div
    class="p-4 my-2.5 rounded-xl border transition-all duration-300 relative overflow-hidden"
    :class="[
      action.severity === 'danger'
        ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-600/60'
        : action.severity === 'warning'
        ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-600/60'
        : 'bg-blue-950/20 border-blue-800/40 hover:border-blue-600/60',
      action.status === 'completed' ? 'opacity-80 border-emerald-500/40 bg-emerald-950/20' : ''
    ]"
  >
    <!-- Header with status -->
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="flex items-center gap-2">
        <component
          :is="getIcon(action.type)"
          class="w-4 h-4"
          :class="[
            action.status === 'completed' ? 'text-emerald-400' :
            action.severity === 'danger' ? 'text-rose-400' :
            action.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
          ]"
        />
        <h4 class="text-sm font-semibold text-slate-200">{{ action.title }}</h4>
      </div>

      <span
        v-if="action.status === 'completed'"
        class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
      >
        <Check class="w-3 h-3" />
        已优化完成
      </span>
    </div>

    <!-- Impact & Benefit -->
    <div class="space-y-1.5 text-xs text-slate-300 mb-3">
      <p class="leading-relaxed text-slate-400">{{ action.impactDescription }}</p>
      <div class="flex items-center gap-1.5 font-medium" :class="action.status === 'completed' ? 'text-emerald-300' : 'text-blue-300'">
        <Zap class="w-3.5 h-3.5 flex-shrink-0" />
        <span>{{ action.expectedBenefit }}</span>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
      <span class="text-[11px] text-slate-500 flex items-center gap-1">
        <Shield class="w-3 h-3 text-slate-400" />
        点击即时执行，安全可控
      </span>

      <button
        v-if="action.status === 'pending'"
        @click="$emit('execute', action)"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
        :class="[
          action.severity === 'danger'
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/25'
            : action.severity === 'warning'
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/25'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/25'
        ]"
      >
        <Play class="w-3 h-3 fill-current" />
        <span>{{ action.actionButtonText }}</span>
      </button>

      <button
        v-else-if="action.status === 'executing'"
        disabled
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 flex items-center gap-2 cursor-wait"
      >
        <Loader2 class="w-3.5 h-3.5 animate-spin text-blue-400" />
        <span>正在执行修复...</span>
      </button>

      <button
        v-else
        disabled
        class="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 cursor-default"
      >
        <Check class="w-3.5 h-3.5" />
        <span>执行成功</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, Loader2, Check, Shield, Zap, Trash2, XCircle, Wifi, FastForward, Wrench } from 'lucide-vue-next';
import type { ActionCardData } from '@/types';

defineProps<{
  action: ActionCardData;
}>();

defineEmits<{
  (e: 'execute', action: ActionCardData): void;
}>();

const getIcon = (type: ActionCardData['type']) => {
  switch (type) {
    case 'kill_process': return XCircle;
    case 'clean_disk': return Trash2;
    case 'fix_network': return Wifi;
    case 'speedup_boot': return FastForward;
    default: return Wrench;
  }
};
</script>
