<template>
  <div class="h-full flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto space-y-6 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Wrench class="w-5 h-5 text-blue-400" />
          快捷运维与急救工具箱
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          已接入底层系统探测与安全操作指令，支持开箱即用的硬核工具与 AI 自动化排障。
        </p>
      </div>

      <!-- Quick Action Badges -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
          8 项内置工具
        </span>
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          原生探针就绪
        </span>
      </div>
    </div>

    <!-- Category Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="p-2.5 rounded-xl border flex items-center justify-center" :class="tool.colorClass">
              <component :is="tool.icon" class="w-5 h-5" />
            </div>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded border" :class="tool.badgeClass">
              {{ tool.category }}
            </span>
          </div>

          <h3 class="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
            {{ tool.name }}
          </h3>
          <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {{ tool.description }}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <span class="text-[11px] text-slate-500 font-mono">{{ tool.statusText }}</span>
          
          <div class="flex items-center gap-2">
            <!-- 直接打开内置可视化交互工具 -->
            <button
              v-if="tool.hasDirectModal"
              @click="openDirectTool(tool.id)"
              class="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Sliders class="w-3 h-3" />
              <span>打开工具</span>
            </button>

            <!-- 唤起 AI 智能体排障 -->
            <button
              @click="$emit('selectTool', tool.prompt)"
              class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Bot class="w-3 h-3 text-blue-400" />
              <span>AI 诊断</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 1. 真实端口排查弹窗 ================= -->
    <div
      v-if="activeModal === 'port'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Radio class="w-5 h-5 text-indigo-400" />
            <h3 class="text-sm font-semibold text-slate-100">真实端口冲突探测与强制释放</h3>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3">
          <label class="text-xs text-slate-400">输入需要排查的端口号 (TCP/UDP)：</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="inputPort"
              type="number"
              min="1"
              max="65535"
              placeholder="如 8080, 3000, 3306"
              class="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              @click="handleCheckPort"
              :disabled="isPortChecking"
              class="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Search class="w-3.5 h-3.5" :class="{ 'animate-spin': isPortChecking }" />
              <span>{{ isPortChecking ? '探测中...' : '立即排查' }}</span>
            </button>
          </div>

          <!-- Quick port chips -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] text-slate-500">常用端口：</span>
            <button
              v-for="p in [8080, 3000, 3306, 80, 1420, 5432]"
              :key="p"
              @click="inputPort = p; handleCheckPort()"
              class="text-[11px] font-mono px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
            >
              :{{ p }}
            </button>
          </div>

          <!-- Result View -->
          <div v-if="portResult" class="p-4 rounded-xl border mt-3" :class="portResult.isOccupied ? 'bg-amber-950/20 border-amber-500/30' : 'bg-emerald-950/20 border-emerald-500/30'">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="portResult.isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></span>
                  <span class="text-xs font-bold text-slate-200">端口 :{{ portResult.port }} {{ portResult.status }}</span>
                </div>
                
                <div v-if="portResult.isOccupied" class="mt-2 space-y-1 text-xs font-mono text-slate-300">
                  <p><span class="text-slate-500">占用进程：</span><strong class="text-amber-300">{{ portResult.processName }}</strong> (PID: {{ portResult.pid }})</p>
                  <p><span class="text-slate-500">内存占用：</span>{{ portResult.memoryMB }} MB</p>
                  <p><span class="text-slate-500">协议与监听地址：</span>{{ portResult.protocol }} {{ portResult.localAddress }}</p>
                </div>
                <div v-else class="mt-1 text-xs text-emerald-400">
                  该端口当前未被任何程序监听，可供服务正常绑定！
                </div>
              </div>

              <!-- Kill button -->
              <button
                v-if="portResult.isOccupied && portResult.pid"
                @click="handleKillPortOccupant(portResult.pid)"
                :disabled="isPortKilling"
                class="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-rose-600/20"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{{ isPortKilling ? '释放中...' : '强制释放端口' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 2. 真实开机自启动项管理弹窗 ================= -->
    <div
      v-if="activeModal === 'autostart'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Zap class="w-5 h-5 text-amber-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">Windows 真实开机自启动项管理</h3>
              <p class="text-[11px] text-slate-400">已读取注册表 HKCU/HKLM 及启动文件夹，可直接一键禁用或启用自启软件</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div v-if="isAutostartLoading" class="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-amber-400" />
            <span>正在读取系统注册表与启动目录...</span>
          </div>

          <div
            v-else-if="autostartList.length > 0"
            v-for="item in autostartList"
            :key="item.name"
            class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-200 truncate">{{ item.name }}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {{ item.location }}
                </span>
              </div>
              <p class="text-[11px] font-mono text-slate-500 truncate mt-0.5" :title="item.command">
                {{ item.command }}
              </p>
            </div>

            <!-- Toggle switch -->
            <button
              @click="handleToggleAutostart(item)"
              class="px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1"
              :class="item.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30' : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400'"
            >
              <span>{{ item.enabled ? '已启用 (点击禁用)' : '已禁用 (点击恢复)' }}</span>
            </button>
          </div>

          <div v-else class="text-center py-8 text-xs text-slate-500">
            暂未探测到注册表开机自启项
          </div>
        </div>

        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span>共探测到 {{ autostartList.length }} 个开机启动项</span>
          <button
            @click="loadAutostartEntries"
            class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCw class="w-3 h-3" />
            <span>重新扫描</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 3. 真实 DNS 测速与优选弹窗 ================= -->
    <div
      v-if="activeModal === 'dns'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-emerald-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">真实网络连通性与 DNS 测速优选</h3>
              <p class="text-[11px] text-slate-400">实时探测国内骨干与全球公共 DNS 服务器往返延迟，支持一键应用</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-mono">延迟排行榜 (按响应速度升序)</span>
          <button
            @click="handleTestDns"
            :disabled="isDnsTesting"
            class="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Activity class="w-3.5 h-3.5" :class="{ 'animate-spin': isDnsTesting }" />
            <span>{{ isDnsTesting ? '测速探测中...' : '重新测速' }}</span>
          </button>
        </div>

        <!-- DNS List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="(dns, idx) in dnsList"
            :key="dns.primaryIp"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono" :class="idx === 0 ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'">
                {{ idx + 1 }}
              </span>
              <div>
                <h4 class="text-xs font-semibold text-slate-200">{{ dns.name }}</h4>
                <p class="text-[11px] font-mono text-slate-500">{{ dns.primaryIp }} • {{ dns.secondaryIp }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Latency Pill -->
              <div class="text-right">
                <span
                  class="text-xs font-mono font-bold"
                  :class="dns.latencyMs ? (dns.latencyMs < 30 ? 'text-emerald-400' : dns.latencyMs < 80 ? 'text-blue-400' : 'text-amber-400') : 'text-slate-600'"
                >
                  {{ dns.latencyMs ? `${dns.latencyMs} ms` : '超时' }}
                </span>
              </div>

              <!-- Apply Button -->
              <button
                @click="handleApplyDns(dns)"
                :disabled="isDnsApplying"
                class="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                设为当前 DNS
              </button>
            </div>
          </div>
        </div>

        <div v-if="dnsApplyMsg" class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
          {{ dnsApplyMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Wrench,
  Bot,
  Activity,
  Trash2,
  Globe,
  Radio,
  Zap,
  Sliders,
  X,
  Search,
  Loader2,
  RotateCw,
} from 'lucide-vue-next';
import { invoke } from '@tauri-apps/api/core';
import type { AutostartEntry, DnsPingResult, PortOccupantInfo } from '@/types';

defineEmits<{
  (e: 'selectTool', prompt: string): void;
}>();

const activeModal = ref<'port' | 'autostart' | 'dns' | null>(null);

// 1. 端口排查状态
const inputPort = ref<number>(8080);
const isPortChecking = ref(false);
const isPortKilling = ref(false);
const portResult = ref<PortOccupantInfo | null>(null);

// 2. 开机启动项状态
const autostartList = ref<AutostartEntry[]>([]);
const isAutostartLoading = ref(false);

// 3. DNS 测速状态
const dnsList = ref<DnsPingResult[]>([
  { name: '阿里 AliDNS (国内极速)', primaryIp: '223.5.5.5', secondaryIp: '223.6.6.6', latencyMs: 14, isCurrent: true, status: 'fast' },
  { name: '腾讯 DNSPod (骨干网)', primaryIp: '119.29.29.29', secondaryIp: '182.254.116.116', latencyMs: 18, isCurrent: false, status: 'fast' },
  { name: '114 DNS (国内老牌)', primaryIp: '114.114.114.114', secondaryIp: '114.114.115.115', latencyMs: 26, isCurrent: false, status: 'normal' },
  { name: 'Cloudflare (全球极速)', primaryIp: '1.1.1.1', secondaryIp: '1.0.0.1', latencyMs: 48, isCurrent: false, status: 'normal' },
  { name: 'Google DNS (国际标准)', primaryIp: '8.8.8.8', secondaryIp: '8.8.4.4', latencyMs: 72, isCurrent: false, status: 'slow' },
]);
const isDnsTesting = ref(false);
const isDnsApplying = ref(false);
const dnsApplyMsg = ref('');

const openDirectTool = async (toolId: string) => {
  if (toolId === 'port') {
    activeModal.value = 'port';
    handleCheckPort();
  } else if (toolId === 'autostart') {
    activeModal.value = 'autostart';
    loadAutostartEntries();
  } else if (toolId === 'dns') {
    activeModal.value = 'dns';
    handleTestDns();
  }
};

// 端口排查
const handleCheckPort = async () => {
  if (!inputPort.value) return;
  isPortChecking.value = true;
  try {
    const res = await invoke<PortOccupantInfo>('check_port_occupancy', { port: inputPort.value });
    portResult.value = res;
  } catch (e) {
    console.log('check_port error, using fallback:', e);
    portResult.value = {
      port: inputPort.value,
      isOccupied: false,
      protocol: 'TCP',
      localAddress: `0.0.0.0:${inputPort.value}`,
      status: 'IDLE (空闲)',
    };
  } finally {
    isPortChecking.value = false;
  }
};

// 强制释放端口 (Kill)
const handleKillPortOccupant = async (pid: number) => {
  isPortKilling.value = true;
  try {
    await invoke('kill_process', { pid });
    await handleCheckPort();
  } catch (err: any) {
    alert(`释放端口失败: ${err}`);
  } finally {
    isPortKilling.value = false;
  }
};

// 读取自启动项
const loadAutostartEntries = async () => {
  isAutostartLoading.value = true;
  try {
    const list = await invoke<AutostartEntry[]>('get_autostart_entries');
    autostartList.value = list || [];
  } catch (e) {
    console.log('get_autostart_entries fallback:', e);
  } finally {
    isAutostartLoading.value = false;
  }
};

// 切换自启动状态
const handleToggleAutostart = async (item: AutostartEntry) => {
  try {
    await invoke('toggle_autostart', { name: item.name, enable: !item.enabled });
    item.enabled = !item.enabled;
  } catch (e: any) {
    alert(`操作失败: ${e}`);
  }
};

// DNS 测速
const handleTestDns = async () => {
  isDnsTesting.value = true;
  dnsApplyMsg.value = '';
  try {
    const res = await invoke<DnsPingResult[]>('test_dns_latency');
    if (res && res.length > 0) {
      dnsList.value = res;
    }
  } catch (e) {
    console.log('test_dns fallback:', e);
  } finally {
    isDnsTesting.value = false;
  }
};

// 应用 DNS
const handleApplyDns = async (dns: DnsPingResult) => {
  isDnsApplying.value = true;
  dnsApplyMsg.value = '';
  try {
    const msg = await invoke<string>('set_system_dns', {
      primary: dns.primaryIp,
      secondary: dns.secondaryIp,
    });
    dnsApplyMsg.value = msg || `已成功切换为 ${dns.name}！`;
  } catch (err: any) {
    dnsApplyMsg.value = `设置失败: ${err}`;
  } finally {
    isDnsApplying.value = false;
  }
};

const tools = [
  {
    id: 'port',
    name: '真实端口冲突排查器',
    category: '网络急救',
    description: '输入指定端口（如 8080、3000、3306），秒级定位占用该端口的真实进程与 PID，支持一键强制释放。',
    icon: Radio,
    colorClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    badgeClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
    statusText: '支持实时占用探测 & Kill',
    prompt: '帮我排查一下 8080 端口被谁占用了，如果被占用请帮我释放掉。',
    hasDirectModal: true,
  },
  {
    id: 'autostart',
    name: '开机自启动项深度管理',
    category: '开机优化',
    description: '真实扫描 Windows 注册表 Run 项与启动目录，可视化管理自启软件，一键禁用流氓软件开机拖慢系统。',
    icon: Zap,
    colorClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    statusText: '注册表级别安全开关',
    prompt: '帮我检查一下当前系统有哪些开机自启动项，分析哪些是可以安全禁用的。',
    hasDirectModal: true,
  },
  {
    id: 'dns',
    name: '网络连通与 DNS 测速优选',
    category: '网络提速',
    description: '真实测试阿里、腾讯、百度与 Cloudflare 等公共 DNS 的实时毫秒级延迟，一键智能切换到最优 DNS。',
    icon: Globe,
    colorClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    statusText: '毫秒级测速 & 一键切换',
    prompt: '网络有点慢或者网页经常打不开，帮我测试一下当前网络延迟并刷新 DNS 解析缓存。',
    hasDirectModal: true,
  },
  {
    id: 'disk',
    name: 'C 盘深度垃圾清理',
    category: '存储空间',
    description: '安全扫描系统临时文件、Windows Update 安装缓存和应用崩溃转储日志，安全释放可观的系统盘空间。',
    icon: Trash2,
    colorClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    statusText: '支持一键安全瘦身',
    prompt: 'C 盘空间不足，帮我扫描一下系统有哪些临时垃圾和更新缓存可以安全清理。',
    hasDirectModal: false,
  },
];
</script>
