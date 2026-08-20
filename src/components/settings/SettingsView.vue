<template>
  <div class="h-full overflow-y-auto p-6 max-w-4xl space-y-6">
    <!-- Model Provider Section -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Bot class="w-4 h-4 text-blue-400" />
            <span>AI 大模型与推理引擎配置</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">选择并配置系统维护工具箱使用的 AI 大模型后端。</p>
        </div>

        <span
          class="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
          :class="isTesting ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : (hasConfiguredApiKey() ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700')"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="isTesting ? 'bg-amber-400 animate-ping' : (hasConfiguredApiKey() ? 'bg-emerald-400' : 'bg-slate-500')"></span>
          {{ isTesting ? '测试中...' : (hasConfiguredApiKey() ? '已配置 (支持真实推理)' : '未配置 (运行在演示模式)') }}
        </span>
      </div>

      <!-- Provider Radio Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        <div
          v-for="provider in providers"
          :key="provider.id"
          @click="switchProvider(provider.id as any)"
          class="p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between"
          :class="settings.aiProvider === provider.id ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="font-medium text-xs text-slate-200">{{ provider.name }}</div>
            <span v-if="provider.tag" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {{ provider.tag }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 leading-snug">{{ provider.desc }}</div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div class="space-y-3 pt-2">
        <div v-if="settings.aiProvider !== 'ollama'">
          <label class="block text-xs font-medium text-slate-300 mb-1">API Key 密钥</label>
          <input
            v-model="settings.apiKey"
            type="password"
            placeholder="sk-..."
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">API 接入地址 (Endpoint)</label>
            <input
              v-model="settings.apiEndpoint"
              type="text"
              placeholder="https://api.deepseek.com/v1"
              class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono text-slate-300"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">模型名称 (Model ID)</label>
            <input
              v-model="settings.modelName"
              type="text"
              placeholder="deepseek-chat"
              class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-mono text-slate-300"
            />
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button
            @click="handleTestConnection"
            :disabled="isTesting"
            class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isTesting" class="w-3.5 h-3.5 animate-spin" />
            <Sparkles v-else class="w-3.5 h-3.5 text-blue-400" />
            <span>测试真实连接与延迟</span>
          </button>

          <span
            v-if="testResult"
            class="text-xs flex items-center gap-1 font-mono"
            :class="testSuccess ? 'text-emerald-400' : 'text-rose-400'"
          >
            <Check v-if="testSuccess" class="w-3.5 h-3.5" />
            <AlertCircle v-else class="w-3.5 h-3.5" />
            {{ testResult }}
          </span>
        </div>
      </div>
    </div>

    <!-- Security & Guardrails -->
    <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
        <Shield class="w-4 h-4 text-emerald-400" />
        <span>安全防护与操作审计 (Guardrails)</span>
      </h3>

      <div class="space-y-3 divide-y divide-slate-800/60 text-xs">
        <div class="flex items-center justify-between pt-2">
          <div>
            <div class="font-medium text-slate-200">高危操作必须二次确认</div>
            <div class="text-slate-500 text-[11px] mt-0.5">结束重要进程、修改网络适配器配置或清理大文件前，必须弹出对话框经由人工确认。</div>
          </div>
          <input
            v-model="settings.requireConfirmForDangerousActions"
            type="checkbox"
            class="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        </div>

        <div class="flex items-center justify-between pt-3">
          <div>
            <div class="font-medium text-slate-200">只读探针静默执行</div>
            <div class="text-slate-500 text-[11px] mt-0.5">采集 CPU、内存、日志等无害诊断动作直接在后台静默运行，保证排障流畅体验。</div>
          </div>
          <input type="checkbox" checked class="w-4 h-4 accent-blue-600 cursor-pointer" />
        </div>

        <div class="flex items-center justify-between pt-3">
          <div>
            <div class="font-medium text-slate-200">破坏性危险命令黑名单</div>
            <div class="text-slate-500 text-[11px] mt-0.5">严禁执行格式化磁盘、删除系统根目录、篡改关键系统组件等破坏性指令。</div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">强制开启</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Bot, Shield, Sparkles, Loader2, Check, AlertCircle } from 'lucide-vue-next';
import { useSettings } from '@/composables/useSettings';
import { testAiConnection } from '@/services/aiClient';

const { settings, switchProvider, hasConfiguredApiKey } = useSettings();

const isTesting = ref(false);
const testSuccess = ref(false);
const testResult = ref('');

const providers = [
  { id: 'deepseek', name: 'DeepSeek (推荐)', tag: '超高性价比', desc: '深度推理能力极强，推荐 DeepSeek-V3 / R1 模型。' },
  { id: 'ollama', name: 'Ollama (本地离线)', tag: '断网可用', desc: '100% 隐私安全，自动直连本地 127.0.0.1:11434。' },
  { id: 'qwen', name: '通义千问 (Qwen)', tag: '国内极速', desc: '阿里云通义千问，国内网络访问延迟极低。' },
  { id: 'openai', name: 'OpenAI (GPT-4o)', tag: '国际主流', desc: '支持 GPT-4o / GPT-4o-mini 等全系列模型。' },
  { id: 'claude', name: 'Claude 3.5 Sonnet', tag: '代码强项', desc: 'Anthropic 旗舰模型，极擅长精准命令生成。' },
];

const handleTestConnection = async () => {
  isTesting.value = true;
  testResult.value = '';
  const res = await testAiConnection(settings);
  isTesting.value = false;
  testSuccess.value = res.success;
  testResult.value = res.message;
};
</script>
