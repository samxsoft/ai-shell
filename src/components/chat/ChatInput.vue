<template>
  <div class="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-4">
    <!-- Quick Prompt Pills -->
    <div class="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
      <span class="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
        <Sparkles class="w-3.5 h-3.5 text-blue-400" />
        快捷提问:
      </span>
      <button
        v-for="prompt in quickPrompts"
        :key="prompt.label"
        @click="$emit('selectPrompt', prompt.query)"
        :disabled="isGenerating"
        class="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800 text-slate-300 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
      >
        {{ prompt.label }}
      </button>
    </div>

    <!-- Text Input Bar -->
    <div class="relative flex items-center">
      <input
        v-model="inputQuery"
        @keydown.enter="handleSend"
        type="text"
        :disabled="isGenerating"
        placeholder="向 AI 系统管家提问，例如：为什么电脑这么卡？C盘怎么清理？网络连不上..."
        class="w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 text-slate-200 text-sm rounded-xl pl-4 pr-24 py-3 placeholder:text-slate-500 outline-none transition-all"
      />

      <div class="absolute right-2 flex items-center gap-1.5">
        <button
          @click="handleSend"
          :disabled="!inputQuery.trim() || isGenerating"
          class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-blue-500/25"
        >
          <Loader2 v-if="isGenerating" class="w-3.5 h-3.5 animate-spin" />
          <Send v-else class="w-3.5 h-3.5" />
          <span>{{ isGenerating ? '诊断中' : '发送' }}</span>
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
      <span>支持自然语言诊断、自动探针调用与一键可控修复</span>
      <span>按 <kbd class="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">Enter</kbd> 发送</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Send, Loader2, Sparkles } from 'lucide-vue-next';

const props = defineProps<{
  quickPrompts: { label: string; query: string }[];
  isGenerating: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', query: string): void;
  (e: 'selectPrompt', query: string): void;
}>();

const inputQuery = ref('');

const handleSend = () => {
  if (!inputQuery.value.trim() || props.isGenerating) return;
  emit('send', inputQuery.value);
  inputQuery.value = '';
};
</script>
