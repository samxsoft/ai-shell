<template>
  <div class="h-full flex flex-col justify-between overflow-hidden relative select-none">
    <!-- Top Session Toolbar -->
    <div class="h-10 px-4 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between z-10">
      <!-- Left: Session Switcher & Current Title -->
      <div class="flex items-center gap-2">
        <button
          @click="showSessionDrawer = !showSessionDrawer"
          class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          :class="showSessionDrawer ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'"
          title="展开/收起历史会话列表"
        >
          <History class="w-3.5 h-3.5" />
          <span>历史会话 ({{ sessions.length }})</span>
          <ChevronDown class="w-3 h-3 transition-transform" :class="{ 'rotate-180': showSessionDrawer }" />
        </button>

        <span class="text-slate-700">|</span>

        <!-- Current Session Title (Editable) -->
        <div class="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <MessageSquare class="w-3.5 h-3.5 text-blue-400" />
          <span class="max-w-[200px] sm:max-w-[320px] truncate">{{ currentSessionTitle }}</span>
        </div>
      </div>

      <!-- Right: New Chat & Export Report -->
      <div class="flex items-center gap-2">
        <!-- Export Markdown Report -->
        <button
          @click="$emit('exportReport')"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/50"
          title="将当前诊断过程与结论导出为 Markdown 报告"
        >
          <Download class="w-3.5 h-3.5 text-indigo-400" />
          <span>导出排障报告</span>
        </button>

        <!-- New Chat Button -->
        <button
          @click="$emit('newSession')"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>新建对话</span>
        </button>
      </div>
    </div>

    <!-- Dropdown / Overlay History Sessions Drawer -->
    <div
      v-if="showSessionDrawer"
      class="absolute top-10 left-4 w-80 max-h-[70vh] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-30 flex flex-col p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <ListOrdered class="w-3.5 h-3.5 text-blue-400" />
          排障诊断历史列表
        </span>
        <button @click="showSessionDrawer = false" class="text-slate-500 hover:text-white cursor-pointer">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Sessions List -->
      <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh]">
        <div
          v-for="s in sessions"
          :key="s.id"
          @click="selectSession(s.id)"
          class="group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2"
          :class="s.id === currentSessionId ? 'bg-blue-600/15 border-blue-500/40 text-blue-300' : 'bg-slate-950/60 border-slate-800/60 hover:bg-slate-800/60 text-slate-300'"
        >
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-medium truncate">{{ s.title }}</h4>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5">{{ s.updatedAt || s.createdAt }} • {{ s.messages.length }} 条记录</p>
          </div>

          <!-- Actions: Rename & Delete -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="promptRename(s)"
              class="p-1 hover:text-blue-300 text-slate-400 cursor-pointer rounded"
              title="重命名会话"
            >
              <Pencil class="w-3 h-3" />
            </button>
            <button
              @click.stop="$emit('deleteSession', s.id)"
              class="p-1 hover:text-rose-400 text-slate-400 cursor-pointer rounded"
              title="删除此会话"
            >
              <Trash2 class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>共 {{ sessions.length }} 个诊断会话</span>
        <button
          @click="$emit('newSession'); showSessionDrawer = false"
          class="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus class="w-3 h-3" />
          <span>开启新诊断</span>
        </button>
      </div>
    </div>

    <!-- Messages Scroll Area -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto p-6 space-y-4">
      <MessageItem
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        @execute-action="$emit('executeAction', $event)"
      />
    </div>

    <!-- Bottom Input -->
    <ChatInput
      :quick-prompts="quickPrompts"
      :is-generating="isGenerating"
      @send="$emit('sendMessage', $event)"
      @select-prompt="$emit('sendMessage', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { History, MessageSquare, Download, Plus, ChevronDown, ListOrdered, X, Pencil, Trash2 } from 'lucide-vue-next';
import MessageItem from './MessageItem.vue';
import ChatInput from './ChatInput.vue';
import type { ChatMessage, ActionCardData, ChatSession } from '@/types';

const props = defineProps<{
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string;
  quickPrompts: { label: string; query: string }[];
  isGenerating: boolean;
}>();

const emit = defineEmits<{
  (e: 'sendMessage', query: string): void;
  (e: 'executeAction', action: ActionCardData): void;
  (e: 'newSession'): void;
  (e: 'switchSession', id: string): void;
  (e: 'renameSession', id: string, newTitle: string): void;
  (e: 'deleteSession', id: string): void;
  (e: 'exportReport'): void;
}>();

const showSessionDrawer = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);

const currentSessionTitle = computed(() => {
  const s = props.sessions.find((item) => item.id === props.currentSessionId);
  return s?.title || '排障对话';
});

const selectSession = (id: string) => {
  emit('switchSession', id);
  showSessionDrawer.value = false;
};

const promptRename = (session: ChatSession) => {
  const newName = window.prompt('请输入新的会话标题：', session.title);
  if (newName && newName.trim()) {
    emit('renameSession', session.id, newName.trim());
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

watch(
  () => props.messages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);
</script>
