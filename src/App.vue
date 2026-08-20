<template>
  <div class="flex h-screen w-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden">
    <!-- Left Sidebar -->
    <Sidebar
      :active-tab="activeTab"
      :metrics="metrics"
      @update:active-tab="activeTab = $event"
    />

    <!-- Right Main Workspace -->
    <div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/30">
      <!-- Top Navigation & Status Bar -->
      <TopHeader
        :active-tab="activeTab"
        :metrics="metrics"
        @quick-check="handleTopQuickCheck"
      />

      <!-- Tab Content Area -->
      <main class="flex-1 overflow-hidden relative">
        <!-- 1. Chat Tab -->
        <ChatView
          v-if="activeTab === 'chat'"
          :messages="messages"
          :sessions="sessions"
          :current-session-id="currentSessionId"
          :quick-prompts="quickPrompts"
          :is-generating="isGenerating"
          @send-message="sendMessage"
          @execute-action="onExecuteAction"
          @new-session="createNewSession"
          @switch-session="switchSession"
          @rename-session="renameSession"
          @delete-session="deleteSession"
          @export-report="exportSessionToMarkdown"
        />


        <!-- 2. Monitor Tab -->
        <MonitorView
          v-else-if="activeTab === 'monitor'"
          :metrics="metrics"
          :processes="processes"
          @kill-process="handleKillProcess"
        />

        <!-- 3. Toolbox Tab -->
        <ToolboxView
          v-else-if="activeTab === 'toolbox'"
          @select-tool="handleToolSelect"
        />


        <!-- 4. Settings Tab -->
        <SettingsView
          v-else-if="activeTab === 'settings'"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { NavTab, ActionCardData } from '@/types';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopHeader from '@/components/layout/TopHeader.vue';
import ChatView from '@/components/chat/ChatView.vue';
import MonitorView from '@/components/monitor/MonitorView.vue';
import ToolboxView from '@/components/toolbox/ToolboxView.vue';
import SettingsView from '@/components/settings/SettingsView.vue';
import { useSystemMock } from '@/composables/useSystemMock';
import { useAgentChat } from '@/composables/useAgentChat';

const activeTab = ref<NavTab>('chat');

// 系统指标与进程状态
const {
  metrics,
  processes,
  killProcess,
  cleanDiskGarbage,
  resetNetworkState,
} = useSystemMock();

// AI 对话与 Action 调度
const {
  sessions,
  currentSessionId,
  messages,
  quickPrompts,
  isGenerating,
  createNewSession,
  switchSession,
  renameSession,
  deleteSession,
  exportSessionToMarkdown,
  sendMessage,
  handleActionExecution,
} = useAgentChat((action: ActionCardData) => {
  // Action 完成后的系统联动反应
  if (action.type === 'kill_process' && action.details?.pid) {
    killProcess(action.details.pid);
  } else if (action.type === 'clean_disk') {
    cleanDiskGarbage(action.details?.freedGB || 8.5);
  } else if (action.type === 'fix_network') {
    resetNetworkState();
  }
});


const onExecuteAction = (action: ActionCardData) => {
  handleActionExecution(action);
};

const handleKillProcess = (pid: number) => {
  killProcess(pid);
};

const handleToolSelect = (prompt: string) => {
  activeTab.value = 'chat';
  createNewSession();
  sendMessage(prompt);
};

const handleTopQuickCheck = () => {
  activeTab.value = 'chat';
  createNewSession();
  sendMessage('进行全系统深度体检，列出所有性能瓶颈与优化建议。');
};

</script>