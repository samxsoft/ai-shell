<template>
  <div class="flex gap-3 mb-5 select-text" :class="message.sender === 'user' ? 'justify-end' : 'justify-start'">
    <!-- AI Avatar -->
    <div
      v-if="message.sender === 'ai'"
      class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 ring-1 ring-white/10"
    >
      <Bot class="w-4 h-4 text-white" />
    </div>

    <!-- Message Bubble -->
    <div
      class="max-w-[88%] min-w-0 rounded-2xl p-4 shadow-sm overflow-hidden"
      :class="[
        message.sender === 'user'
          ? 'bg-blue-600 text-white rounded-tr-sm ml-12 text-sm leading-relaxed whitespace-pre-wrap break-words'
          : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-tl-sm'
      ]"
    >
      <!-- User text (plain) or AI text (Industrial Markdown) -->
      <div v-if="message.sender === 'user'">
        {{ message.content }}
      </div>

      <div v-else class="leading-relaxed min-w-0">
        <template v-if="message.content">
          <div class="markdown-body min-w-0 inline leading-relaxed" v-html="renderMarkdown(message.content)"></div>
          <span
            v-if="message.isStreaming"
            class="inline-block w-1.5 h-4 bg-blue-400 dark:bg-teal-400 animate-pulse ml-1 align-middle rounded-sm shadow-sm shadow-blue-400/50"
          ></span>
        </template>
        
        <!-- Streaming Thinking Indicator & Spinner (only when waiting for first token) -->
        <div
          v-if="message.isStreaming && !message.content"
          class="flex items-center gap-2.5 text-blue-400 text-xs py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 font-mono mt-1"
        >
          <Loader2 class="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
          <span class="animate-pulse font-medium">{{ t('chat.thinking') }}</span>
        </div>
      </div>


      <!-- Dedicated Executive Summary Banner -->
      <div
        v-if="message.sender === 'ai' && message.summary"
        class="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-blue-500/30 text-xs leading-relaxed space-y-1.5 shadow-sm"
      >
        <div class="flex items-center gap-1.5 font-semibold text-blue-300">
          <Lightbulb class="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{{ t('chat.summaryTitle') }}</span>
        </div>
        <div class="text-slate-200 pl-5.5 space-y-1" v-html="renderMarkdown(message.summary)"></div>
      </div>

      <!-- Action Cards rendered below AI message -->
      <div v-if="message.actionCards && message.actionCards.length > 0" class="mt-4 space-y-2">
        <div class="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
          <Sparkles class="w-3.5 h-3.5 text-blue-400" />
          <span>{{ t('chat.actionPlanTitle') }}</span>
        </div>
        <ActionCard
          v-for="action in message.actionCards"
          :key="action.id"
          :action="action"
          @execute="$emit('executeAction', $event)"
        />
      </div>


      <!-- Log Tabs (Diagnostic Probes & AI Interaction Debugger) -->
      <div v-if="message.sender === 'ai'" class="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-4 flex-wrap">
        <!-- 1. 查看底层探针日志 -->
        <button
          v-if="message.diagnostics && message.diagnostics.length > 0"
          @click="showProbeLogs = !showProbeLogs"
          class="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-300 transition-colors py-0.5 cursor-pointer font-mono"
        >
          <ChevronRight class="w-3 h-3 transition-transform duration-200" :class="{ 'rotate-90': showProbeLogs }" />
          <span>{{ t('chat.probeLogs', message.diagnostics.length) }}</span>
        </button>

        <!-- 2. 查看与 AI 的完整交互日志 -->
        <button
          v-if="message.aiDebugLogs && message.aiDebugLogs.length > 0"
          @click="showAiLogs = !showAiLogs"
          class="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 cursor-pointer font-mono"
        >
          <Code class="w-3 h-3" />
          <span>{{ showAiLogs ? t('chat.aiLogsClose') : t('chat.aiLogsOpen', message.aiDebugLogs.length) }}</span>
        </button>
      </div>

      <!-- 1. 展开底层探针日志面板 -->
      <div v-if="showProbeLogs && message.diagnostics && message.diagnostics.length > 0" class="mt-2 space-y-2">
        <div
          v-for="(log, idx) in message.diagnostics"
          :key="idx"
          class="p-2.5 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono"
        >
          <div class="flex items-center justify-between text-blue-400 mb-1">
            <span class="flex items-center gap-1">
              <Terminal class="w-3 h-3" />
              $ {{ log.command }}
            </span>
            <span class="text-slate-500">{{ log.timestamp }}</span>
          </div>
          <pre class="text-slate-300 whitespace-pre-wrap overflow-x-auto text-[10px] leading-tight">{{ log.output }}</pre>
        </div>
      </div>

      <!-- 2. 展开 AI 完整交互日志面板 -->
      <div v-if="showAiLogs && message.aiDebugLogs && message.aiDebugLogs.length > 0" class="mt-2 space-y-2">
        <div
          v-for="(debugLog, idx) in message.aiDebugLogs"
          :key="idx"
          class="p-2.5 rounded-lg bg-slate-950 border border-indigo-900/40 text-[11px] font-mono"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-semibold flex items-center gap-1.5" :class="getDebugLogColor(debugLog.type)">
              <span class="w-1.5 h-1.5 rounded-full" :class="getDebugDotColor(debugLog.type)"></span>
              {{ debugLog.title }}
            </span>
            <span class="text-slate-500 text-[10px]">{{ debugLog.timestamp }}</span>
          </div>
          <pre class="text-slate-300 whitespace-pre-wrap overflow-x-auto text-[10px] leading-relaxed bg-black/50 p-2 rounded border border-slate-800/80">{{ typeof debugLog.payload === 'string' ? debugLog.payload : JSON.stringify(debugLog.payload, null, 2) }}</pre>
        </div>
      </div>

      <!-- Timestamp -->
      <div class="text-[10px] text-right mt-2" :class="message.sender === 'user' ? 'text-blue-200/70' : 'text-slate-500'">
        {{ message.timestamp }}
      </div>
    </div>

    <!-- User Avatar -->
    <div
      v-if="message.sender === 'user'"
      class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0"
    >
      <User class="w-4 h-4 text-slate-300" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Bot, User, Loader2, ChevronRight, Terminal, Sparkles, Code, Lightbulb } from 'lucide-vue-next';
import { useI18n } from '@/composables/useI18n';
import { marked } from 'marked';
import ActionCard from './ActionCard.vue';
import type { ChatMessage, ActionCardData } from '@/types';

const { t } = useI18n();

defineProps<{
  message: ChatMessage;
}>();

defineEmits<{
  (e: 'executeAction', action: ActionCardData): void;
}>();

const showProbeLogs = ref(false);
const showAiLogs = ref(false);

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderMarkdown = (raw: string): string => {
  if (!raw) return '';
  try {
    return marked.parse(raw) as string;
  } catch {
    return raw;
  }
};

const getDebugLogColor = (type: string) => {
  switch (type) {
    case 'request': return 'text-blue-400';
    case 'response': return 'text-emerald-400';
    case 'tool_call': return 'text-amber-400';
    case 'tool_result': return 'text-indigo-400';
    case 'error': return 'text-rose-400';
    default: return 'text-slate-300';
  }
};

const getDebugDotColor = (type: string) => {
  switch (type) {
    case 'request': return 'bg-blue-400';
    case 'response': return 'bg-emerald-400';
    case 'tool_call': return 'bg-amber-400';
    case 'tool_result': return 'bg-indigo-400';
    case 'error': return 'bg-rose-400';
    default: return 'bg-slate-400';
  }
};
</script>
