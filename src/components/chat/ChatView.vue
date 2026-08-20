<template>
  <div class="h-full flex flex-col justify-between overflow-hidden relative">
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
import { ref, watch, nextTick } from 'vue';
import MessageItem from './MessageItem.vue';
import ChatInput from './ChatInput.vue';
import type { ChatMessage, ActionCardData } from '@/types';

const props = defineProps<{
  messages: ChatMessage[];
  quickPrompts: { label: string; query: string }[];
  isGenerating: boolean;
}>();

defineEmits<{
  (e: 'sendMessage', query: string): void;
  (e: 'executeAction', action: ActionCardData): void;
}>();

const scrollContainer = ref<HTMLElement | null>(null);

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
