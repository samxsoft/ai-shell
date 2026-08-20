<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="visible"
        ref="menuRef"
        class="fixed z-[9999] w-52 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }"
        @click.stop
      >
        <!-- 1. Copy with Rich Format -->
        <button
          v-if="selectedText"
          @click="handleCopy(false)"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <Check v-if="copiedType === 'rich'" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
            <span :class="{ 'text-emerald-400 font-medium': copiedType === 'rich' }">
              {{ copiedType === 'rich' ? '已复制(带格式)！' : '复制 (保留排版格式)' }}
            </span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">富文本</span>
        </button>

        <!-- 2. Copy Plain Text Only -->
        <button
          v-if="selectedText"
          @click="handleCopy(true)"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <Check v-if="copiedType === 'plain'" class="w-3.5 h-3.5 text-emerald-400" />
            <FileText v-else class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span :class="{ 'text-emerald-400 font-medium': copiedType === 'plain' }">
              {{ copiedType === 'plain' ? '已复制纯文本！' : '仅复制纯文本' }}
            </span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">Ctrl+C</span>
        </button>

        <!-- Ask AI with selected text -->
        <button
          v-if="selectedText && selectedText.length <= 300"
          @click="handleAskAi"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <Bot class="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            <span>向 AI 追问此内容</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">AI</span>
        </button>


        <!-- Cut (Editable target only) -->
        <button
          v-if="isEditable && selectedText"
          @click="handleCut"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <Scissors class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>剪切</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">Ctrl+X</span>
        </button>

        <!-- Paste (Editable target only) -->
        <button
          v-if="isEditable"
          @click="handlePaste"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <ClipboardPaste class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>粘贴</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">Ctrl+V</span>
        </button>

        <div v-if="selectedText || isEditable" class="h-px bg-slate-800 my-1"></div>

        <!-- Select All -->
        <button
          @click="handleSelectAll"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 transition-colors cursor-pointer group"
        >
          <div class="flex items-center gap-2">
            <CheckSquare class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>全选</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">Ctrl+A</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { Copy, Check, Bot, Scissors, ClipboardPaste, CheckSquare, FileText } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'askAi', text: string): void;
}>();

const visible = ref(false);
const position = ref({ x: 0, y: 0 });
const selectedText = ref('');
const isEditable = ref(false);
const copiedType = ref<'rich' | 'plain' | null>(null);
const menuRef = ref<HTMLElement | null>(null);
let activeTarget: HTMLElement | null = null;

const onContextMenu = async (e: MouseEvent) => {
  // 必须阻止默认的 WebView2 浏览器右键菜单
  e.preventDefault();

  const target = e.target as HTMLElement | null;
  activeTarget = target;

  const sel = window.getSelection()?.toString() || '';
  selectedText.value = sel.trim();

  isEditable.value = !!(
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input') !== null ||
      target.closest('textarea') !== null)
  );

  // 如果既没有选中文本，也不是输入编辑框，且不是对话气泡/文本区域，则不展示右键菜单
  const isMessageOrText = target?.closest('.select-text') || target?.closest('.markdown-body') || target?.closest('.select-all-zone');
  if (!selectedText.value && !isEditable.value && !isMessageOrText) {
    visible.value = false;
    return;
  }

  // 计算弹窗坐标，防止溢出屏幕
  const menuWidth = 210;
  const menuHeight = 180;
  let posX = e.clientX + 2;
  let posY = e.clientY + 2;

  if (posX + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 8;
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = window.innerHeight - menuHeight - 8;
  }

  position.value = { x: Math.max(8, posX), y: Math.max(8, posY) };
  copiedType.value = null;
  visible.value = true;
};

const closeMenu = () => {
  visible.value = false;
  copiedType.value = null;
};

const handleCopy = async (pureTextOnly = false) => {
  if (!selectedText.value) {
    closeMenu();
    return;
  }

  try {
    const selection = window.getSelection();
    // 智能提取 HTML 选区格式（支持加粗、标题、表格、代码高亮等排版）
    if (!pureTextOnly && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      const htmlContent = container.innerHTML;
      const plainText = selection.toString();

      if (htmlContent && htmlContent !== plainText && typeof ClipboardItem !== 'undefined') {
        try {
          const blobHtml = new Blob([htmlContent], { type: 'text/html' });
          const blobText = new Blob([plainText], { type: 'text/plain' });
          const item = new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          });
          await navigator.clipboard.write([item]);
          copiedType.value = 'rich';
          setTimeout(closeMenu, 400);
          return;
        } catch (itemErr) {
          console.warn('ClipboardItem HTML 写入受限，自动回退为纯文本:', itemErr);
        }
      }
    }

    // 纯文本标准复制
    await navigator.clipboard.writeText(selectedText.value);
    copiedType.value = pureTextOnly ? 'plain' : 'rich';
    setTimeout(closeMenu, 400);
  } catch (e) {
    console.warn('复制失败:', e);
    closeMenu();
  }
};



const handleCut = async () => {
  if (selectedText.value && activeTarget) {
    try {
      await navigator.clipboard.writeText(selectedText.value);
      if ('value' in activeTarget && typeof (activeTarget as HTMLInputElement).value === 'string') {
        const input = activeTarget as HTMLInputElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        input.value = input.value.slice(0, start) + input.value.slice(end);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      console.warn('剪切失败:', e);
    }
  }
  closeMenu();
};

const handlePaste = async () => {
  if (activeTarget && 'value' in activeTarget) {
    try {
      const text = await navigator.clipboard.readText();
      const input = activeTarget as HTMLInputElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      input.value = input.value.slice(0, start) + text + input.value.slice(end);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    } catch (e) {
      console.warn('粘贴失败:', e);
    }
  }
  closeMenu();
};

const handleAskAi = () => {
  if (selectedText.value) {
    emit('askAi', `请帮我解释并分析以下内容：\n\n${selectedText.value}`);
  }
  closeMenu();
};

const handleSelectAll = () => {
  if (activeTarget) {
    if ('select' in activeTarget && typeof (activeTarget as HTMLInputElement).select === 'function') {
      (activeTarget as HTMLInputElement).select();
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      const parent = activeTarget.closest('.markdown-body') || activeTarget.closest('.select-text') || activeTarget;
      range.selectNodeContents(parent);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }
  closeMenu();
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
};

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('contextmenu', onContextMenu);
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', onKeyDown);
});
</script>
