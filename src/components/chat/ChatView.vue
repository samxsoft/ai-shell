<template>
  <div class="h-full flex flex-col justify-between overflow-hidden relative">
    <!-- Top Session Toolbar -->
    <div class="h-10 px-4 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between z-10 select-none">

      <!-- Left: Session Switcher & Current Title -->
      <div class="flex items-center gap-2">
        <button
          @click="showSessionDrawer = !showSessionDrawer"
          class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          :class="showSessionDrawer ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'"
          :title="locale === 'zh-CN' ? '展开/收起历史会话列表' : 'Toggle Session History'"
        >
          <History class="w-3.5 h-3.5" />
          <span>{{ t('chat.sessionList') }} ({{ sessions.length }})</span>
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
          @click="handleOpenExportModal"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/50"
          :title="locale === 'zh-CN' ? '预览并导出当前排障诊断报告' : 'Preview and Export Diagnostic Report'"
        >
          <Download class="w-3.5 h-3.5 text-indigo-400" />
          <span>{{ t('common.export') }}</span>
        </button>

        <!-- New Chat Button -->
        <button
          @click="$emit('newSession')"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>{{ t('chat.newChat') }}</span>
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
        <div class="flex items-center gap-2">
          <button
            @click="$emit('clearAllSessions'); showSessionDrawer = false"
            class="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1 cursor-pointer hover:bg-rose-500/10 px-1.5 py-0.5 rounded transition-colors"
            title="一键清空所有历史排障会话记录"
          >
            <Trash2 class="w-3 h-3" />
            <span>清空全部</span>
          </button>
          <button @click="showSessionDrawer = false" class="text-slate-500 hover:text-white cursor-pointer">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
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
        <button
          @click="$emit('clearAllSessions'); showSessionDrawer = false"
          class="text-rose-400/80 hover:text-rose-300 flex items-center gap-1 cursor-pointer hover:underline"
        >
          <Trash2 class="w-3 h-3" />
          <span>清空所有会话</span>
        </button>
        <button
          @click="$emit('newSession'); showSessionDrawer = false"
          class="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
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
      <!-- Invisible anchor for bulletproof instant scrollIntoView -->
      <div ref="bottomAnchor" class="h-px w-full pointer-events-none opacity-0"></div>
    </div>

    <!-- Bottom Input -->
    <ChatInput
      :quick-prompts="quickPrompts"
      :is-generating="isGenerating"
      @send="$emit('sendMessage', $event)"
      @select-prompt="$emit('sendMessage', $event)"
    />

    <!-- Diagnostic Report Export & Preview Modal -->
    <div
      v-if="showReportModal"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[88vh] space-y-4">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Download class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                系统排障诊断报告预览与导出
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Markdown / File
                </span>
              </h3>
              <p class="text-xs text-slate-400">完整包含用户问答、诊断总结 (Executive Summary)、探针日志与处置卡片</p>
            </div>
          </div>

          <button
            @click="showReportModal = false"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Markdown Preview Content -->
        <div class="flex-1 overflow-y-auto bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed max-h-[50vh] whitespace-pre-wrap select-text">
          {{ reportMarkdown }}
        </div>

        <!-- Save Feedback Msg -->
        <div v-if="reportSaveMsg" class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono text-center">
          {{ reportSaveMsg }}
        </div>

        <!-- Actions Toolbar -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <div class="text-[11px] text-slate-500">
            支持直接保存为本地文件或快速拷贝
          </div>

          <div class="flex items-center gap-2.5">
            <!-- Copy Button -->
            <button
              @click="handleCopyReport"
              class="px-3.5 py-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              :class="reportCopied ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'"
            >
              <CheckCircle2 v-if="reportCopied" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>{{ reportCopied ? '已复制到剪贴板！' : '一键复制 Markdown' }}</span>
            </button>

            <!-- Save File & Open Explorer Button -->
            <button
              @click="handleSaveReportFile"
              :disabled="isSavingReport"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer border border-white/10"
            >
              <RotateCw v-if="isSavingReport" class="w-3.5 h-3.5 animate-spin" />
              <FileDown v-else class="w-3.5 h-3.5" />
              <span>保存文件并打开目录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import {
  History,
  MessageSquare,
  Download,
  Plus,
  ChevronDown,
  ListOrdered,
  X,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  FileDown,
  RotateCw,
} from 'lucide-vue-next';
import { invoke } from '@tauri-apps/api/core';
import MessageItem from './MessageItem.vue';
import ChatInput from './ChatInput.vue';
import type { ChatMessage, ActionCardData, ChatSession } from '@/types';
import { useI18n } from '@/composables/useI18n';

const { t, locale } = useI18n();

const props = defineProps<{
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string;
  quickPrompts: { label: string; query: string }[];
  isGenerating: boolean;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'sendMessage', query: string): void;
  (e: 'executeAction', action: ActionCardData): void;
  (e: 'newSession'): void;
  (e: 'switchSession', id: string): void;
  (e: 'renameSession', id: string, newTitle: string): void;
  (e: 'deleteSession', id: string): void;
  (e: 'clearAllSessions'): void;
  (e: 'exportReport'): void;
}>();

const showSessionDrawer = ref(false);
const showReportModal = ref(false);
const reportMarkdown = ref('');
const reportCopied = ref(false);
const reportSaveMsg = ref('');
const isSavingReport = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);

const currentSessionTitle = computed(() => {
  const s = props.sessions.find((item) => item.id === props.currentSessionId);
  return s?.title || (locale.value === 'zh-CN' ? '排障会话' : 'AI Session');
});

function generateReportMarkdown(session: ChatSession): string {
  let md = `# AI-Shell 系统排障与维护诊断报告\n\n`;
  md += `- **会话主题**: ${session.title}\n`;
  md += `- **导出时间**: ${new Date().toLocaleString()}\n`;
  md += `- **会话创建**: ${session.createdAt}\n`;
  md += `- **诊断轮次**: ${session.messages.filter((m) => m.sender === 'user').length} 轮问答\n\n`;
  md += `---\n\n## 📝 诊断全过程记录\n\n`;

  for (const msg of session.messages) {
    const role = msg.sender === 'user' ? '👤 用户提问' : '🤖 AI 系统管家';
    md += `### ${role} (${msg.timestamp})\n\n`;
    md += `${msg.content}\n\n`;

    if (msg.summary) {
      md += `> 💡 **AI 诊断总结与建议 (Executive Summary)**:\n> \n> ${msg.summary.split('\n').join('\n> ')}\n\n`;
    }

    if (msg.diagnostics && msg.diagnostics.length > 0) {
      md += `#### 🔬 底层系统探针采集日志:\n\`\`\`bash\n`;
      for (const log of msg.diagnostics) {
        md += `[${log.timestamp}] $ ${log.command}\n${log.output}\n\n`;
      }
      md += `\`\`\`\n\n`;
    }

    if (msg.actionCards && msg.actionCards.length > 0) {
      md += `#### ⚡ 推荐处置方案与执行状态:\n`;
      for (const card of msg.actionCards) {
        const statusText = card.status === 'completed' ? '✅ 已执行' : card.status === 'executing' ? '⏳ 执行中' : '⚪ 待执行';
        md += `- **[${statusText}] ${card.title}**\n`;
        md += `  - 影响说明: ${card.impactDescription}\n`;
        md += `  - 预期收益: ${card.expectedBenefit}\n\n`;
      }
    }

    md += `---\n\n`;
  }
  return md;
}

const handleOpenExportModal = () => {
  const s = props.sessions.find((item) => item.id === props.currentSessionId) || props.sessions[0];
  if (!s) return;
  reportMarkdown.value = generateReportMarkdown(s);
  reportSaveMsg.value = '';
  reportCopied.value = false;
  showReportModal.value = true;
};

const handleCopyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportMarkdown.value);
    reportCopied.value = true;
    setTimeout(() => {
      reportCopied.value = false;
    }, 2000);
  } catch (e) {
    console.warn('复制失败:', e);
  }
};

const handleSaveReportFile = async () => {
  isSavingReport.value = true;
  reportSaveMsg.value = '';
  const s = props.sessions.find((item) => item.id === props.currentSessionId) || props.sessions[0];
  const title = s?.title || '排障报告';
  try {
    const savedPath = await invoke<string>('save_diagnostic_report', {
      title,
      content: reportMarkdown.value,
    });
    reportSaveMsg.value = `✅ 已成功保存报告并打开所在目录: ${savedPath}`;
  } catch (e) {
    // 浏览器 fallback 下载
    const blob = new Blob([reportMarkdown.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Shell-排障报告-${title.replace(/[\\/:*?"<>|]/g, '_')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    reportSaveMsg.value = `✅ 已触发下载: ${a.download}`;
  } finally {
    isSavingReport.value = false;
  }
};

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

const scrollToBottom = () => {
  nextTick(() => {
    bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' });
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });

  // RAF 确保在浏览器绘制下一帧时精确贴底
  requestAnimationFrame(() => {
    bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' });
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });

  // 异步二次校准（防止 Markdown 表格、折叠块或代码高亮异步排版撑开高度）
  setTimeout(() => {
    bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' });
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  }, 60);

  setTimeout(() => {
    bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' });
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  }, 200);
};

// 1. 初次挂载时滚到底部
onMounted(() => {
  scrollToBottom();
});

// 2. 从监控/工具箱/设置等其他 Tab 切回 AI 排障 Tab 时，触发贴底
watch(
  () => props.isActive,
  (active) => {
    if (active) {
      scrollToBottom();
    }
  }
);

// 3. 切换历史会话时自动滚到底部
watch(
  () => props.currentSessionId,
  () => {
    scrollToBottom();
  }
);

// 4. 消息流式输出或新增时自动滚到底部
watch(
  () => props.messages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);
</script>
