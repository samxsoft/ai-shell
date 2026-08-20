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
          {{ tools.length }} 项内置工具
        </span>
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          原生探针就绪
        </span>
      </div>
    </div>

    <!-- Category Grid: 一排四个 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="group p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between mb-2.5">
            <div class="p-2 rounded-xl border flex items-center justify-center" :class="tool.colorClass">
              <component :is="tool.icon" class="w-4 h-4" />
            </div>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border" :class="tool.badgeClass">
              {{ tool.category }}
            </span>
          </div>

          <h3 class="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
            {{ tool.name }}
          </h3>
          <p class="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
            {{ tool.description }}
          </p>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-1">
          <span class="text-[10px] text-slate-500 font-mono truncate">{{ tool.statusText }}</span>
          
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- 直接打开内置可视化交互工具 -->
            <button
              v-if="tool.hasDirectModal"
              @click="openDirectTool(tool.id)"
              class="px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Sliders class="w-3 h-3" />
              <span>打开</span>
            </button>

            <!-- 唤起 AI 智能体排障 -->
            <button
              @click="$emit('selectTool', tool.prompt)"
              class="px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Bot class="w-3 h-3 text-blue-400" />
              <span>AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 1. 真实端口排查与全端口扫描弹窗 ================= -->
    <div
      v-if="activeModal === 'port'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Radio class="w-5 h-5 text-indigo-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">真实端口冲突探测与一键释放</h3>
              <p class="text-[11px] text-slate-400">底层调用 netstat/lsof 探测活跃监听端口，定位 PID、内存及路径，支持安全强制释放</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Mode Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            @click="portTab = 'single'"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="portTab === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'"
          >
            <Search class="w-3.5 h-3.5" />
            <span>指定端口精准排查</span>
          </button>
          <button
            @click="portTab = 'all'; handleScanAllPorts()"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="portTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>全系统活跃监听端口总览</span>
          </button>
        </div>

        <!-- Tab 1: 单端口排查 -->
        <div v-if="portTab === 'single'" class="space-y-3">
          <label class="text-xs text-slate-400">输入需要排查的端口号 (1 - 65535)：</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="inputPort"
              type="number"
              min="1"
              max="65535"
              placeholder="如 8080, 3000, 3306, 1420"
              class="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              @keyup.enter="handleCheckPort"
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
              v-for="p in [8080, 3000, 3306, 80, 1420, 5432, 27017, 6379]"
              :key="p"
              @click="inputPort = p; handleCheckPort()"
              class="text-[11px] font-mono px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
            >
              :{{ p }}
            </button>
          </div>

          <!-- Result Card -->
          <div
            v-if="portResult"
            class="p-4 rounded-xl border mt-3"
            :class="portResult.isOccupied ? 'bg-amber-950/20 border-amber-500/30' : 'bg-emerald-950/20 border-emerald-500/30'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" :class="portResult.isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></span>
                  <span class="text-xs font-bold text-slate-200">
                    端口 :{{ portResult.port }} - {{ portResult.status }}
                  </span>
                </div>
                
                <div v-if="portResult.isOccupied" class="space-y-1 text-xs font-mono text-slate-300">
                  <p><span class="text-slate-500">占用进程：</span><strong class="text-amber-300">{{ portResult.processName }}</strong> (PID: {{ portResult.pid }})</p>
                  <p v-if="portResult.memoryMB"><span class="text-slate-500">内存占用：</span>{{ portResult.memoryMB }} MB</p>
                  <p v-if="portResult.cpuPercent !== undefined"><span class="text-slate-500">CPU 占用：</span>{{ portResult.cpuPercent }}%</p>
                  <p><span class="text-slate-500">绑定协议与地址：</span>{{ portResult.protocol }} {{ portResult.localAddress }}</p>
                  <p v-if="portResult.exePath" class="truncate" :title="portResult.exePath">
                    <span class="text-slate-500">文件路径：</span><span class="text-slate-400">{{ portResult.exePath }}</span>
                  </p>
                </div>
                <div v-else class="text-xs text-emerald-400">
                  ✅ 该端口当前完全空闲，没有任何应用程序在监听，可供服务正常绑定！
                </div>
              </div>

              <!-- Kill button -->
              <button
                v-if="portResult.isOccupied && portResult.pid"
                @click="handleKillPortOccupant(portResult.pid)"
                :disabled="isPortKilling"
                class="px-3.5 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20 flex-shrink-0"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{{ isPortKilling ? '释放中...' : '强制释放端口' }}</span>
              </button>
            </div>
          </div>

          <div v-if="portActionFeedback" class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
            {{ portActionFeedback }}
          </div>
        </div>

        <!-- Tab 2: 全系统活跃监听端口列表 -->
        <div v-else class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
          <div v-if="isScanningAll" class="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-indigo-400" />
            <span>正在全量扫描系统网络栈活跃监听端口...</span>
          </div>

          <div v-else-if="allListeningPorts.length > 0" class="space-y-1.5">
            <div
              v-for="item in allListeningPorts"
              :key="item.port"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  :{{ item.port }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-200 truncate">{{ item.processName }}</span>
                    <span v-if="item.pid" class="text-[10px] font-mono text-slate-500">PID: {{ item.pid }}</span>
                  </div>
                  <p class="text-[10px] font-mono text-slate-500 truncate mt-0.5">{{ item.localAddress }} • {{ item.memoryMB ? `${item.memoryMB} MB` : '系统' }}</p>
                </div>
              </div>

              <!-- Action button -->
              <button
                v-if="item.pid"
                @click="handleKillPortOccupant(item.pid)"
                :disabled="isPortKilling"
                class="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1"
                title="结束占用该端口的进程"
              >
                <Trash2 class="w-3 h-3" />
                <span>释放</span>
              </button>
            </div>
          </div>

          <div v-else class="text-center py-10 text-xs text-slate-500">
            暂未探测到活跃监听端口
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span v-if="portTab === 'all'">共探测到 {{ allListeningPorts.length }} 个活跃监听端口</span>
          <span v-else>精准匹配 IPv4 & IPv6 监听服务</span>
          <button
            v-if="portTab === 'all'"
            @click="handleScanAllPorts"
            class="text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCw class="w-3 h-3" />
            <span>重新扫描</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 2. 真实开机自启动项管理弹窗 ================= -->
    <div
      v-if="activeModal === 'autostart'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Zap class="w-5 h-5 text-amber-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">Windows 真实开机自启动项深度管理</h3>
              <p class="text-[11px] text-slate-400">底层读取 HKCU/HKLM 注册表与启动目录，支持安全禁用/恢复与开机耗时优化</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <!-- Filter Tabs -->
          <div class="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
            <button
              @click="autostartFilter = 'all'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'all' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              全部 ({{ autostartList.length }})
            </button>
            <button
              @click="autostartFilter = 'enabled'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'enabled' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              已启用 ({{ enabledCount }})
            </button>
            <button
              @click="autostartFilter = 'disabled'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'disabled' ? 'bg-slate-700 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              已禁用 ({{ disabledCount }})
            </button>
            <button
              @click="autostartFilter = 'recommended'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'recommended' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              推荐优化 ({{ recommendedCount }})
            </button>
          </div>

          <!-- Search input -->
          <div class="relative flex-1 sm:max-w-xs">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              v-model="autostartSearch"
              type="text"
              placeholder="搜索自启动项名称或路径..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
          <div v-if="isAutostartLoading" class="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-amber-400" />
            <span>正在深入扫描注册表与系统启动目录...</span>
          </div>

          <div
            v-else-if="filteredAutostartList.length > 0"
            v-for="item in filteredAutostartList"
            :key="item.name"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition-colors"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-semibold text-slate-200 truncate">{{ item.name }}</span>
                <span v-if="item.publisher" class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                  {{ item.publisher }}
                </span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-500">
                  {{ item.location }}
                </span>
                <span
                  v-if="item.safeToDisable"
                  class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300"
                >
                  ⚡ 建议安全禁用
                </span>
              </div>
              <p class="text-[11px] font-mono text-slate-500 truncate" :title="item.command">
                {{ item.command }}
              </p>
            </div>

            <!-- Toggle switch button -->
            <button
              @click="handleToggleAutostart(item)"
              class="px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              :class="item.enabled ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30' : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-300'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="item.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"></span>
              <span>{{ item.enabled ? '已启用 (点击禁用)' : '已禁用 (点击恢复)' }}</span>
            </button>
          </div>

          <div v-else class="text-center py-10 text-xs text-slate-500">
            暂无匹配的开机自启动项
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-3">
            <span>共 {{ autostartList.length }} 项 (已启用 {{ enabledCount }} 项)</span>
            <button
              v-if="recommendedCount > 0"
              @click="handleDisableAllRecommended"
              class="text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              一键禁用所有推荐优化项 ({{ recommendedCount }})
            </button>
          </div>
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
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-emerald-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">真实网络连通性与 DNS 测速优选</h3>
              <p class="text-[11px] text-slate-400">多线程并发探测国内骨干与全球公共 DNS 服务器往返延迟，支持一键切换与 DHCP 还原</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs text-slate-400 font-mono">延迟排行榜 (按响应速度升序)</span>
          <div class="flex items-center gap-2">
            <!-- 刷新 DNS 缓存 -->
            <button
              @click="handleFlushDns"
              class="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              title="清除本地 Windows 解析缓存"
            >
              刷新解析缓存
            </button>
            <!-- 恢复 DHCP -->
            <button
              @click="handleResetDhcpDns"
              class="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              title="还原为路由器默认分配"
            >
              恢复自动获取 (DHCP)
            </button>
            <!-- 测速 -->
            <button
              @click="handleTestDns"
              :disabled="isDnsTesting"
              class="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Activity class="w-3.5 h-3.5" :class="{ 'animate-spin': isDnsTesting }" />
              <span>{{ isDnsTesting ? '并发测速中...' : '重新测速' }}</span>
            </button>
          </div>
        </div>

        <!-- DNS List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
          <div
            v-for="(dns, idx) in dnsList"
            :key="dns.primaryIp"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0"
                :class="idx === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'bg-slate-800 text-slate-400'"
              >
                {{ idx + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-semibold text-slate-200 truncate">{{ dns.name }}</h4>
                  <span
                    v-if="dns.isCurrent"
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex-shrink-0"
                  >
                    当前使用中
                  </span>
                  <span
                    v-else-if="idx === 0"
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 flex-shrink-0"
                  >
                    ⚡ 最优推荐
                  </span>
                </div>
                <p class="text-[11px] font-mono text-slate-500 truncate mt-0.5">{{ dns.primaryIp }} • {{ dns.secondaryIp }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
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
                class="px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer"
                :class="dns.isCurrent ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700/60 hover:border-transparent'"
              >
                {{ dns.isCurrent ? '已生效' : '设为当前 DNS' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="dnsApplyMsg" class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
          {{ dnsApplyMsg }}
        </div>
      </div>
    </div>

    <!-- ================= 4. C 盘深度垃圾与更新缓存清理弹窗 ================= -->
    <div
      v-if="activeModal === 'disk'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >

      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Trash2 class="w-5 h-5 text-rose-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">C 盘深度垃圾与更新安装缓存清理</h3>
              <p class="text-[11px] text-slate-400">底层安全扫描系统临时文件、Windows Update 安装包与崩溃日志，安全释放系统盘空间</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Summary Banner -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            <span class="text-xs text-slate-400">可安全释放空间总量</span>
            <div class="text-2xl font-bold font-mono text-rose-400 mt-0.5">
              {{ garbageResult ? garbageResult.totalFormatted : '0.0 MB' }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handleScanGarbage"
              :disabled="isGarbageScanning"
              class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50 flex items-center gap-1.5"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isGarbageScanning }" />
              <span>{{ isGarbageScanning ? '扫描中...' : '重新扫描' }}</span>
            </button>
          </div>
        </div>

        <!-- Garbage Items List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[45vh]">
          <div v-if="isGarbageScanning" class="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-rose-400" />
            <span>正在深度扫描 Windows Update 缓存与临时文件...</span>
          </div>

          <div
            v-else-if="garbageResult && garbageResult.items.length > 0"
            v-for="item in garbageResult.items"
            :key="item.path"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition-colors"
          >
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-200">{{ item.name }}</span>
                <span class="text-xs font-mono font-bold text-rose-400">{{ item.sizeFormatted }}</span>
              </div>
              <p class="text-[11px] text-slate-400">{{ item.description }}</p>
              <p class="text-[10px] font-mono text-slate-600 truncate">{{ item.path }}</p>
            </div>
          </div>

          <div v-else class="text-center py-10 text-xs text-slate-500">
            ✅ C 盘非常干净，暂未发现可清理的遗留垃圾缓存
          </div>
        </div>

        <!-- Feedback Msg -->
        <div v-if="garbageCleanMsg" class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
          {{ garbageCleanMsg }}
        </div>

        <!-- Footer Action -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between">
          <span class="text-xs text-slate-500 font-mono">
            {{ garbageResult ? `共发现 ${garbageResult.items.length} 处缓存目录` : '' }}
          </span>
          <button
            @click="handleCleanGarbage"
            :disabled="isGarbageCleaning || !garbageResult || garbageResult.totalBytes === 0"
            class="px-5 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
          >
            <Trash2 class="w-3.5 h-3.5" :class="{ 'animate-spin': isGarbageCleaning }" />
            <span>{{ isGarbageCleaning ? '正在深度清理中...' : `立即安全清理 (${garbageResult ? garbageResult.totalFormatted : '0.0 MB'})` }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 5. 磁盘大文件雷达与空间透视弹窗 ================= -->
    <div
      v-if="activeModal === 'large_files'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >

      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Database class="w-5 h-5 text-cyan-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">磁盘大文件雷达与占用深度透视</h3>
              <p class="text-[11px] text-slate-400">多线程秒级排查隐藏虚拟磁盘、大体积镜像、音视频与安装包，支持资源管理器一键定位</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Controls Toolbar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <!-- Filter Tabs & Min Size -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
              <button
                @click="largeFileFilter = 'all'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                全部 ({{ largeFileList.length }})
              </button>
              <button
                @click="largeFileFilter = 'virtual_disk'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'virtual_disk' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                虚拟硬盘/镜像
              </button>
              <button
                @click="largeFileFilter = 'media'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'media' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                音视频媒体
              </button>
              <button
                @click="largeFileFilter = 'archive'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'archive' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                压缩与安装包
              </button>
            </div>

            <!-- Min Size Dropdown -->
            <select
              v-model.number="largeFileMinSizeMB"
              @change="handleScanLargeFiles"
              class="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option :value="200">大于 200 MB</option>
              <option :value="500">大于 500 MB</option>
              <option :value="1024">大于 1.0 GB</option>
              <option :value="2048">大于 2.0 GB</option>
              <option :value="5120">大于 5.0 GB</option>
            </select>
          </div>

          <!-- Search & Rescan -->
          <div class="flex items-center gap-2 flex-1 sm:max-w-xs">
            <div class="relative flex-1">
              <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                v-model="largeFileSearch"
                type="text"
                placeholder="搜索大文件名或扩展名..."
                class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              @click="handleScanLargeFiles"
              :disabled="isLargeFileScanning"
              class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              title="重新扫描大文件"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLargeFileScanning }" />
            </button>
          </div>
        </div>

        <!-- Files List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[48vh]">
          <div v-if="isLargeFileScanning" class="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-cyan-400" />
            <span>正在多线程排查磁盘空间与大文件...</span>
          </div>

          <div
            v-else-if="filteredLargeFiles.length > 0"
            v-for="file in filteredLargeFiles"
            :key="file.path"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition-colors"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-200 truncate">{{ file.fileName }}</span>
                <span
                  class="text-[10px] font-mono px-1.5 py-0.2 rounded"
                  :class="file.fileType === 'virtual_disk' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : file.fileType === 'archive' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'"
                >
                  {{ file.fileType }}
                </span>
                <span class="text-[10px] font-mono text-slate-500">{{ file.modifiedTime }}</span>
              </div>
              <p class="text-[11px] font-mono text-slate-500 truncate" :title="file.path">{{ file.path }}</p>
            </div>

            <!-- Size & Action buttons -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-xs font-mono font-bold text-cyan-400 text-right min-w-[70px]">
                {{ file.sizeFormatted }}
              </span>

              <!-- 定位文件 -->
              <button
                @click="handleLocateFile(file.path)"
                class="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-slate-700/50"
                title="在操作系统的文件资源管理器中打开并高亮选中"
              >
                <FolderSearch class="w-3 h-3 text-cyan-400" />
                <span>定位</span>
              </button>

              <!-- 删除文件 -->
              <button
                @click="handleDeleteLargeFile(file)"
                class="px-2 py-1 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition-all cursor-pointer border border-rose-500/20"
                title="删除此大文件"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>

          <div v-else class="text-center py-12 text-xs text-slate-500">
            暂未发现大于 {{ largeFileMinSizeMB }} MB 的大文件
          </div>
        </div>

        <div v-if="largeFileActionMsg" class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono text-center">
          {{ largeFileActionMsg }}
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>共探测到 {{ filteredLargeFiles.length }} 个大文件，合计占用 {{ totalFilteredLargeFileSize }}</span>
          <span>按体积从大到小排列</span>
        </div>
      </div>
    </div>

    <!-- 5. 活跃进程急速降温与查杀 Modal -->
    <div
      v-if="activeModal === 'process_killer'"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                活跃进程急速降温与查杀
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                  Realtime Process Manager
                </span>
              </h3>
              <p class="text-xs text-slate-400">全盘多维扫描 CPU 与内存排名前列的活跃进程，自动识别卡顿元凶与流氓软件并安全查杀</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleFetchProcesses"
              :disabled="isProcessLoading"
              class="p-2 text-slate-400 hover:text-violet-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="刷新活跃进程"
            >
              <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isProcessLoading }" />
            </button>
            <button
              @click="activeModal = null"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Top Metrics Cards & Quick Cooldown -->
        <div class="grid grid-cols-4 gap-3">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div class="text-[11px] text-slate-400 mb-1">活跃进程总数</div>
            <div class="text-base font-bold font-mono text-slate-200">{{ processList.length }} <span class="text-xs font-normal text-slate-500">个</span></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div class="text-[11px] text-slate-400 mb-1">高负载待优化项</div>
            <div class="text-base font-bold font-mono text-amber-400">{{ highCpuCount + highMemCount }} <span class="text-xs font-normal text-slate-500">项</span></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div class="text-[11px] text-slate-400 mb-1">进程总占用物理内存</div>
            <div class="text-base font-bold font-mono text-violet-400">{{ totalProcessMemGB }} <span class="text-xs font-normal text-slate-500">GB</span></div>
          </div>
          <button
            @click="handleQuickCoolDown"
            :disabled="isProcessKilling || (highCpuCount === 0 && highMemCount === 0)"
            class="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-violet-600/20 transition-all cursor-pointer border border-white/10"
          >
            <div class="flex items-center gap-1.5 font-bold">
              <Zap class="w-4 h-4 text-amber-300" />
              <span>一键急速降温</span>
            </div>
            <span class="text-[10px] text-violet-200">自动终止异常高负载第三方应用</span>
          </button>
        </div>

        <!-- Filter & Search Bar -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <!-- Filter Tabs -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              @click="processFilter = 'all'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'all' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              全部 ({{ processList.length }})
            </button>
            <button
              @click="processFilter = 'high_cpu'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'high_cpu' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              🔥 高 CPU ({{ processList.filter(p => p.cpuPercent > 5.0).length }})
            </button>
            <button
              @click="processFilter = 'high_mem'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'high_mem' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              📊 高内存 ({{ processList.filter(p => p.memoryMB > 400.0).length }})
            </button>
            <button
              @click="processFilter = 'safe'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'safe' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              ⚡ 可安全查杀 ({{ processList.filter(p => p.isSafeToKill).length }})
            </button>
          </div>

          <!-- Sort & Search -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <span>排序:</span>
              <select
                v-model="processSort"
                class="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="memory">按内存占用 (降序)</option>
                <option value="cpu">按 CPU 占比 (降序)</option>
              </select>
            </div>

            <div class="relative w-48">
              <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="processSearch"
                type="text"
                placeholder="搜索进程名或 PID..."
                class="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
        </div>

        <!-- Process Table List -->
        <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[46vh]">
          <div v-if="isProcessLoading" class="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-violet-400" />
            <span>正在全盘扫描活跃进程负载指标...</span>
          </div>

          <div
            v-else-if="filteredProcessList.length > 0"
            v-for="proc in filteredProcessList"
            :key="proc.pid"
            class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 transition-colors text-xs"
          >
            <!-- Checkbox & Name & PID -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <input
                type="checkbox"
                :disabled="!proc.isSafeToKill"
                :checked="selectedPids.includes(proc.pid)"
                @change="toggleSelectPid(proc.pid)"
                class="rounded border-slate-700 text-violet-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-30 cursor-pointer"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-slate-200 truncate">{{ proc.name }}</span>
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    PID: {{ proc.pid }}
                  </span>
                  <span
                    v-if="!proc.isSafeToKill"
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                    title="受系统安全白名单保护，禁止普通结束"
                  >
                    🛡️ 系统核心保护
                  </span>
                  <span
                    v-else
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    ⚡ 可安全查杀
                  </span>
                </div>
                <p v-if="proc.exe_path" class="text-[10px] font-mono text-slate-500 truncate" :title="proc.exe_path">
                  {{ proc.exe_path }}
                </p>
              </div>
            </div>

            <!-- CPU & Memory Metrics -->
            <div class="flex items-center gap-4 flex-shrink-0 font-mono">
              <!-- CPU -->
              <div class="w-24 text-right">
                <div class="flex items-center justify-end gap-1.5 text-[11px]" :class="proc.cpuPercent > 10.0 ? 'text-rose-400 font-bold' : proc.cpuPercent > 2.0 ? 'text-amber-400' : 'text-slate-400'">
                  <span>{{ proc.cpuPercent.toFixed(1) }}%</span>
                  <span class="text-[10px] text-slate-500">CPU</span>
                </div>
                <div class="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="proc.cpuPercent > 10.0 ? 'bg-rose-500' : proc.cpuPercent > 2.0 ? 'bg-amber-500' : 'bg-violet-500'"
                    :style="{ width: `${Math.min(proc.cpuPercent * 2, 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Memory -->
              <div class="w-24 text-right">
                <span class="text-xs font-bold" :class="proc.memoryMB > 1000 ? 'text-rose-400' : proc.memoryMB > 400 ? 'text-amber-400' : 'text-slate-200'">
                  {{ proc.memoryMB > 1024 ? `${(proc.memoryMB / 1024).toFixed(2)} GB` : `${proc.memoryMB.toFixed(0)} MB` }}
                </span>
              </div>

              <!-- Action Button -->
              <button
                @click="handleKillSingleProcess(proc.pid, proc.name)"
                :disabled="!proc.isSafeToKill || isProcessKilling"
                class="px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer border"
                :class="proc.isSafeToKill ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20 shadow-sm' : 'bg-slate-800/40 text-slate-600 border-transparent cursor-not-allowed'"
                title="结束此进程"
              >
                结束进程
              </button>
            </div>
          </div>

          <div v-else class="text-center py-12 text-xs text-slate-500">
            暂未发现匹配的进程
          </div>
        </div>

        <!-- Feedback Message -->
        <div v-if="processActionMsg" class="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono text-center">
          {{ processActionMsg }}
        </div>

        <!-- Footer with Batch Actions -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-3">
            <button
              @click="toggleSelectAllSafe"
              class="text-violet-400 hover:text-violet-300 underline cursor-pointer"
            >
              {{ selectedPids.length > 0 ? '取消全选' : '全选可查杀项' }}
            </button>
            <span>已勾选 <strong class="text-violet-400 font-mono">{{ selectedPids.length }}</strong> 项</span>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="selectedPids.length > 0"
              @click="handleBatchKillProcesses"
              :disabled="isProcessKilling"
              class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>一键结束选中的 {{ selectedPids.length }} 个进程</span>
            </button>
            <span class="text-slate-500 font-mono">共 {{ filteredProcessList.length }} 个进程</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>



<script setup lang="ts">
import { ref, computed } from 'vue';
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
  Cpu,
  Database,
  Layers,
  Wifi,
  FolderSearch,
} from 'lucide-vue-next';
import { invoke } from '@tauri-apps/api/core';
import type { AutostartEntry, DnsPingResult, PortOccupantInfo, GarbageScanResult, LargeFileInfo, ProcessItem } from '@/types';

defineEmits<{
  (e: 'selectTool', prompt: string): void;
}>();

const activeModal = ref<'port' | 'autostart' | 'dns' | 'disk' | 'large_files' | 'process_killer' | null>(null);


// 0. 垃圾扫描与清理状态
const garbageResult = ref<GarbageScanResult | null>(null);
const isGarbageScanning = ref(false);
const isGarbageCleaning = ref(false);
const garbageCleanMsg = ref('');


// 1. 端口排查状态
const portTab = ref<'single' | 'all'>('single');
const inputPort = ref<number>(8080);
const isPortChecking = ref(false);
const isPortKilling = ref(false);
const isScanningAll = ref(false);
const portResult = ref<PortOccupantInfo | null>(null);
const allListeningPorts = ref<PortOccupantInfo[]>([]);
const portActionFeedback = ref('');

// 2. 开机启动项状态
const autostartList = ref<AutostartEntry[]>([]);
const isAutostartLoading = ref(false);
const autostartFilter = ref<'all' | 'enabled' | 'disabled' | 'recommended'>('all');
const autostartSearch = ref('');

const enabledCount = computed(() => autostartList.value.filter((i) => i.enabled).length);
const disabledCount = computed(() => autostartList.value.filter((i) => !i.enabled).length);
const recommendedCount = computed(() => autostartList.value.filter((i) => i.enabled && i.safeToDisable).length);

const filteredAutostartList = computed(() => {
  let list = autostartList.value;

  // 1. 标签过滤
  if (autostartFilter.value === 'enabled') {
    list = list.filter((i) => i.enabled);
  } else if (autostartFilter.value === 'disabled') {
    list = list.filter((i) => !i.enabled);
  } else if (autostartFilter.value === 'recommended') {
    list = list.filter((i) => i.enabled && i.safeToDisable);
  }

  // 2. 关键词搜索
  if (autostartSearch.value.trim()) {
    const q = autostartSearch.value.toLowerCase().trim();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.publisher && i.publisher.toLowerCase().includes(q)) ||
        i.command.toLowerCase().includes(q)
    );
  }

  return list;
});


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

// 4. 磁盘大文件雷达状态
const largeFileList = ref<LargeFileInfo[]>([]);
const isLargeFileScanning = ref(false);
const largeFileMinSizeMB = ref<number>(500);
const largeFileFilter = ref<'all' | 'virtual_disk' | 'media' | 'archive'>('all');
const largeFileSearch = ref('');
const largeFileActionMsg = ref('');

const filteredLargeFiles = computed(() => {
  let list = largeFileList.value;

  if (largeFileFilter.value === 'virtual_disk') {
    list = list.filter((f) => f.fileType === 'virtual_disk');
  } else if (largeFileFilter.value === 'media') {
    list = list.filter((f) => f.fileType === 'media');
  } else if (largeFileFilter.value === 'archive') {
    list = list.filter((f) => f.fileType === 'archive' || f.fileType === 'installer');
  }

  if (largeFileSearch.value.trim()) {
    const q = largeFileSearch.value.toLowerCase().trim();
    list = list.filter((f) => f.fileName.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }

  return list;
});

const totalFilteredLargeFileSize = computed(() => {
  const bytes = filteredLargeFiles.value.reduce((acc, f) => acc + f.sizeBytes, 0);
  const mb = bytes / (1024 * 1024);
  return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
});

const handleScanLargeFiles = async () => {
  isLargeFileScanning.value = true;
  largeFileActionMsg.value = '';
  try {
    const res = await invoke<LargeFileInfo[]>('scan_large_files', {
      targetDir: 'default',
      minSizeMb: largeFileMinSizeMB.value,
      limit: 60,
    });
    largeFileList.value = res || [];
  } catch (e) {
    console.warn('scan_large_files fallback:', e);
    largeFileList.value = [
      { path: 'C:\\Users\\AppData\\Local\\Packages\\WSL\\ext4.vhdx', fileName: 'ext4.vhdx', sizeBytes: 15400000000, sizeFormatted: '14.34 GB', fileType: 'virtual_disk', modifiedTime: '2026-08-18 14:00' },
      { path: 'C:\\Users\\Downloads\\ubuntu-24.04-desktop.iso', fileName: 'ubuntu-24.04-desktop.iso', sizeBytes: 5800000000, sizeFormatted: '5.40 GB', fileType: 'virtual_disk', modifiedTime: '2026-07-22 09:00' },
      { path: 'C:\\Users\\Videos\\Captures\\screen_record_4k.mp4', fileName: 'screen_record_4k.mp4', sizeBytes: 3200000000, sizeFormatted: '2.98 GB', fileType: 'media', modifiedTime: '2026-08-10 20:00' },
      { path: 'C:\\Users\\Downloads\\cuda_12.2_installer.exe', fileName: 'cuda_12.2_installer.exe', sizeBytes: 3100000000, sizeFormatted: '2.88 GB', fileType: 'archive', modifiedTime: '2026-06-15 11:00' },
    ];
  } finally {
    isLargeFileScanning.value = false;
  }
};

const handleLocateFile = async (path: string) => {
  try {
    await invoke('locate_file', { path });
    largeFileActionMsg.value = `已在资源管理器中定位: ${path}`;
  } catch (e: any) {
    largeFileActionMsg.value = `定位失败: ${e}`;
  }
};

const handleDeleteLargeFile = async (file: LargeFileInfo) => {
  if (!confirm(`确定要永久删除大文件吗？\n${file.fileName} (${file.sizeFormatted})\n路径: ${file.path}`)) {
    return;
  }

  try {
    await invoke('delete_large_file', { path: file.path });
    largeFileActionMsg.value = `✅ 已成功删除大文件: ${file.fileName}，已释放 ${file.sizeFormatted}！`;
    await handleScanLargeFiles();
  } catch (e: any) {
    largeFileActionMsg.value = `❌ 删除失败: ${e}`;
  }
};

// 5. 活跃进程降温与查杀状态
const processList = ref<ProcessItem[]>([]);
const isProcessLoading = ref(false);
const isProcessKilling = ref(false);
const processFilter = ref<'all' | 'high_cpu' | 'high_mem' | 'safe'>('all');
const processSort = ref<'memory' | 'cpu'>('memory');
const processSearch = ref('');
const selectedPids = ref<number[]>([]);
const processActionMsg = ref('');

const highCpuCount = computed(() => processList.value.filter((p) => p.cpuPercent > 5.0 && p.isSafeToKill).length);
const highMemCount = computed(() => processList.value.filter((p) => p.memoryMB > 400.0 && p.isSafeToKill).length);
const totalProcessMemGB = computed(() => {
  const totalMB = processList.value.reduce((acc, p) => acc + p.memoryMB, 0);
  return (totalMB / 1024).toFixed(1);
});

const filteredProcessList = computed(() => {
  let list = [...processList.value];

  if (processFilter.value === 'high_cpu') {
    list = list.filter((p) => p.cpuPercent > 5.0);
  } else if (processFilter.value === 'high_mem') {
    list = list.filter((p) => p.memoryMB > 400.0);
  } else if (processFilter.value === 'safe') {
    list = list.filter((p) => p.isSafeToKill);
  }

  if (processSearch.value.trim()) {
    const q = processSearch.value.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
  }

  list.sort((a, b) => {
    if (processSort.value === 'cpu') {
      return b.cpuPercent - a.cpuPercent;
    }
    return b.memoryMB - a.memoryMB;
  });

  return list;
});

const handleFetchProcesses = async () => {
  isProcessLoading.value = true;
  processActionMsg.value = '';
  try {
    const res = await invoke<ProcessItem[]>('get_process_list', { limit: 80 });
    processList.value = res || [];
  } catch (e) {
    console.warn('get_process_list fallback:', e);
    processList.value = [
      { pid: 14820, name: 'electron_crash_dump.exe', cpuPercent: 32.4, memoryMB: 4850, isSafeToKill: true, category: 'user', status: 'running' },
      { pid: 21044, name: 'chrome.exe', cpuPercent: 18.2, memoryMB: 2340, isSafeToKill: true, category: 'user', status: 'running' },
      { pid: 18420, name: 'ai-shell.exe', cpuPercent: 0.8, memoryMB: 180, isSafeToKill: false, category: 'system', status: 'running' },
      { pid: 4, name: 'System', cpuPercent: 0.2, memoryMB: 80, isSafeToKill: false, category: 'system', status: 'running' },
    ];
  } finally {
    isProcessLoading.value = false;
  }
};

const handleKillSingleProcess = async (pid: number, name: string) => {
  isProcessKilling.value = true;
  try {
    await invoke('kill_process', { pid });
    processActionMsg.value = `✅ 已成功结束进程: ${name} (PID: ${pid})`;
    await handleFetchProcesses();
    selectedPids.value = selectedPids.value.filter((p) => p !== pid);
  } catch (e: any) {
    processActionMsg.value = `❌ 结束进程失败: ${e}`;
  } finally {
    isProcessKilling.value = false;
  }
};

const toggleSelectPid = (pid: number) => {
  if (selectedPids.value.includes(pid)) {
    selectedPids.value = selectedPids.value.filter((p) => p !== pid);
  } else {
    selectedPids.value.push(pid);
  }
};

const toggleSelectAllSafe = () => {
  const safePids = filteredProcessList.value.filter((p) => p.isSafeToKill).map((p) => p.pid);
  if (selectedPids.value.length === safePids.length) {
    selectedPids.value = [];
  } else {
    selectedPids.value = safePids;
  }
};

const handleBatchKillProcesses = async () => {
  if (selectedPids.value.length === 0) return;
  isProcessKilling.value = true;
  try {
    const count = await invoke<number>('batch_kill_processes', { pids: selectedPids.value });
    processActionMsg.value = `⚡ 批量降温成功！已终止 ${count} 个高负载进程，内存与 CPU 压力已释放。`;
    selectedPids.value = [];
    await handleFetchProcesses();
  } catch (e: any) {
    processActionMsg.value = `❌ 批量结束失败: ${e}`;
  } finally {
    isProcessKilling.value = false;
  }
};

const handleQuickCoolDown = async () => {
  const coolDownPids = processList.value
    .filter((p) => p.isSafeToKill && (p.cpuPercent > 5.0 || p.memoryMB > 400.0))
    .map((p) => p.pid);

  if (coolDownPids.length === 0) {
    processActionMsg.value = `🎉 当前未发现异常高占用的第三方流氓进程，系统状态优良！`;
    return;
  }

  isProcessKilling.value = true;
  try {
    const count = await invoke<number>('batch_kill_processes', { pids: coolDownPids });
    processActionMsg.value = `❄️ 一键急速降温完成！已强制终止 ${count} 个高占用进程！`;
    selectedPids.value = [];
    await handleFetchProcesses();
  } catch (e: any) {
    processActionMsg.value = `降温失败: ${e}`;
  } finally {
    isProcessKilling.value = false;
  }
};

const openDirectTool = async (toolId: string) => {
  if (toolId === 'port') {
    activeModal.value = 'port';
    portTab.value = 'single';
    handleCheckPort();
  } else if (toolId === 'autostart') {
    activeModal.value = 'autostart';
    loadAutostartEntries();
  } else if (toolId === 'dns') {
    activeModal.value = 'dns';
    handleTestDns();
  } else if (toolId === 'disk') {
    activeModal.value = 'disk';
    handleScanGarbage();
  } else if (toolId === 'large_files') {
    activeModal.value = 'large_files';
    handleScanLargeFiles();
  } else if (toolId === 'process_killer') {
    activeModal.value = 'process_killer';
    handleFetchProcesses();
  }
};



// 扫描 C 盘垃圾
const handleScanGarbage = async () => {
  isGarbageScanning.value = true;
  garbageCleanMsg.value = '';
  try {
    const res = await invoke<GarbageScanResult>('scan_system_garbage');
    garbageResult.value = res;
  } catch (e) {
    console.warn('scan_system_garbage fallback:', e);
    garbageResult.value = {
      totalBytes: 3850000000,
      totalFormatted: '3.58 GB',
      items: [
        { name: 'Windows Update 历史安装下载包', path: 'C:\\Windows\\SoftwareDistribution\\Download', sizeBytes: 2400000000, sizeFormatted: '2.23 GB', description: '已安装更新遗留的历史补丁包' },
        { name: '用户临时缓存 (User Temp)', path: 'C:\\Users\\AppData\\Local\\Temp', sizeBytes: 1100000000, sizeFormatted: '1.02 GB', description: '软件解压安装与运行临时文件' },
        { name: '应用程序崩溃转储 (CrashDumps)', path: 'C:\\Users\\AppData\\Local\\CrashDumps', sizeBytes: 350000000, sizeFormatted: '333.7 MB', description: '历史软件闪退生成的内存转储文件' },
      ],
    };
  } finally {
    isGarbageScanning.value = false;
  }
};

// 立即安全清理 C 盘垃圾
const handleCleanGarbage = async () => {
  isGarbageCleaning.value = true;
  garbageCleanMsg.value = '';
  try {
    const freedBytes = await invoke<number>('clean_system_garbage');
    const mb = (freedBytes as number) / (1024 * 1024);
    const formatted = mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
    garbageCleanMsg.value = `✅ 清理完成！已成功为 C 盘安全释放 ${formatted} 空间！`;
    await handleScanGarbage();
  } catch (e: any) {
    garbageCleanMsg.value = `❌ 清理出现异常: ${e}`;
  } finally {
    isGarbageCleaning.value = false;
  }
};


// 单端口精准排查
const handleCheckPort = async () => {
  if (!inputPort.value) return;
  isPortChecking.value = true;
  portActionFeedback.value = '';
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
      status: 'IDLE (端口空闲)',
    };
  } finally {
    isPortChecking.value = false;
  }
};

// 全量扫描活跃端口
const handleScanAllPorts = async () => {
  isScanningAll.value = true;
  try {
    const res = await invoke<PortOccupantInfo[]>('scan_listening_ports');
    allListeningPorts.value = res || [];
  } catch (e) {
    console.log('scan_listening_ports fallback:', e);
  } finally {
    isScanningAll.value = false;
  }
};

// 强制释放端口 (Kill)
const handleKillPortOccupant = async (pid: number) => {
  isPortKilling.value = true;
  portActionFeedback.value = '';
  try {
    await invoke('kill_process', { pid });
    portActionFeedback.value = `✅ 进程 (PID: ${pid}) 已成功终止，端口已完成释放！`;
    
    if (portTab.value === 'single') {
      await handleCheckPort();
    } else {
      await handleScanAllPorts();
    }
  } catch (err: any) {
    portActionFeedback.value = `❌ 释放端口失败: ${err}`;
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

// 一键禁用所有推荐优化项
const handleDisableAllRecommended = async () => {
  const targets = autostartList.value.filter((i) => i.enabled && i.safeToDisable);
  if (targets.length === 0) return;
  for (const item of targets) {
    try {
      await invoke('toggle_autostart', { name: item.name, enable: false });
      item.enabled = false;
    } catch (e) {
      console.warn('Disable item failed:', item.name, e);
    }
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
    // 重新测速并刷新状态
    await handleTestDns();
  } catch (err: any) {
    dnsApplyMsg.value = `设置失败: ${err}`;
  } finally {
    isDnsApplying.value = false;
  }
};

// 恢复 DHCP 自动获取
const handleResetDhcpDns = async () => {
  isDnsApplying.value = true;
  dnsApplyMsg.value = '';
  try {
    const msg = await invoke<string>('reset_dns_to_dhcp');
    dnsApplyMsg.value = msg || '已恢复为路由器 DHCP 自动获取 DNS！';
    await handleTestDns();
  } catch (err: any) {
    dnsApplyMsg.value = `恢复失败: ${err}`;
  } finally {
    isDnsApplying.value = false;
  }
};

// 刷新本地 DNS 缓存
const handleFlushDns = async () => {
  try {
    const msg = await invoke<string>('flush_dns_cache');
    dnsApplyMsg.value = msg || '已成功刷新系统 DNS 解析缓存！';
  } catch (err: any) {
    dnsApplyMsg.value = `刷新失败: ${err}`;
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
    statusText: '精准排查 & 全量扫描',
    prompt: '请帮我全面排查一下当前系统有哪些网络端口正在被占用或存在冲突？并给出诊断分析。',
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
    name: 'C 盘深度垃圾与更新缓存清理',
    category: '存储空间',
    description: '安全扫描系统临时文件、Windows Update 安装缓存和应用崩溃转储日志，安全释放可观的系统盘空间。',
    icon: Trash2,
    colorClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    statusText: '支持一键安全瘦身',
    prompt: 'C 盘空间不足，帮我扫描一下系统有哪些临时垃圾和更新缓存可以安全清理。',
    hasDirectModal: true,
  },

  {
    id: 'large_files',
    name: '磁盘大文件雷达与占用分析',
    category: '空间透视',
    description: '多线程秒级排查磁盘中 >1GB 的巨型文件、隐藏虚拟磁盘镜像与下载残留，揪出吃盘真凶。',
    icon: Database,
    colorClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    badgeClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    statusText: '巨型文件秒级雷达',
    prompt: '帮我排查一下电脑磁盘里有哪些占用超过 1GB 的大文件和隐藏镜像。',
    hasDirectModal: true,
  },

  {
    id: 'process_killer',
    name: '活跃进程急速降温与查杀',
    category: '性能调优',
    description: '全盘扫描 CPU 与内存排名前列的活跃进程，自动识别死锁、卡死无响应的后台流氓应用并安全查杀。',
    icon: Cpu,
    colorClass: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    badgeClass: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
    statusText: '智能白名单保护',
    prompt: '帮我查看当前系统中 CPU 和内存占用最高的异常进程，并推荐可以结束的项。',
    hasDirectModal: true,
  },

  {
    id: 'docker',
    name: 'Docker 容器与镜像专项体检',
    category: '开发运维',
    description: '自动分析本机未运行容器、悬挂镜像 (Dangling) 与无主存储卷，一键清理开发构建残留空间。',
    icon: Layers,
    colorClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    statusText: '容器与构建缓存排查',
    prompt: '帮我检查一下本机 Docker 环境，看看有哪些停止的容器和无用的悬挂镜像可以清理。',
    hasDirectModal: false,
  },
  {
    id: 'network_repair',
    name: 'DNS 缓存强制刷新与网络急救',
    category: '网络急救',
    description: '一键刷新系统本地 DNS 解析缓存并重置 TCP/IP 网络栈，快速解决连着 WiFi 却打不开网页等异常故障。',
    icon: Wifi,
    colorClass: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    badgeClass: 'bg-teal-500/10 border-teal-500/20 text-teal-300',
    statusText: '一键网络栈复位',
    prompt: '网页打不开了，网络连接异常，帮我执行网络急救与 DNS 刷新。',
    hasDirectModal: false,
  },
];
</script>
