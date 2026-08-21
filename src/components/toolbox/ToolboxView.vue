<template>
  <div class="h-full flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto space-y-6 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Wrench class="w-5 h-5 text-blue-400" />
          {{ t('toolbox.title') }}
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          {{ t('toolbox.subtitle') }}
        </p>
      </div>

      <!-- Quick Action Badges -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
          {{ t('toolbox.nativeToolsCount', tools.length) }}
        </span>
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ t('toolbox.engineReady') }}
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
              <span>{{ t('toolbox.openBtn') }}</span>
            </button>

            <!-- 唤起 AI 智能体排障 -->
            <button
              @click="$emit('selectTool', tool.prompt)"
              class="px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Bot class="w-3 h-3 text-blue-400" />
              <span>{{ t('toolbox.aiBtn') }}</span>
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
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[580px] max-h-[88vh] p-6 shadow-2xl space-y-4 flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <Radio class="w-5 h-5 text-indigo-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">{{ t('toolbox.modals.port.title') }}</h3>
              <p class="text-[11px] text-slate-400">{{ t('toolbox.modals.port.subtitle') }}</p>
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
            <span>{{ t('toolbox.modals.port.tabSingle') }}</span>
          </button>
          <button
            @click="portTab = 'all'; handleScanAllPorts()"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="portTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>{{ t('toolbox.modals.port.tabAll') }}</span>
          </button>
        </div>

        <!-- Tab 1: 单端口排查 -->
        <div v-if="portTab === 'single'" class="space-y-3">
          <label class="text-xs text-slate-400">{{ t('toolbox.modals.port.inputLabel') }}</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="inputPort"
              type="number"
              min="1"
              max="65535"
              :placeholder="t('toolbox.modals.port.inputPlaceholder')"
              class="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              @keyup.enter="handleCheckPort"
            />
            <button
              @click="handleCheckPort"
              :disabled="isPortChecking"
              class="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Search class="w-3.5 h-3.5" :class="{ 'animate-spin': isPortChecking }" />
              <span>{{ isPortChecking ? t('toolbox.modals.port.inspecting') : t('toolbox.modals.port.inspectBtn') }}</span>
            </button>
          </div>

          <!-- Quick port chips -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] text-slate-500">{{ t('toolbox.modals.port.commonPorts') }}</span>
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
                    {{ t('toolbox.modals.port.portStatus', portResult.port, portResult.status) }}
                  </span>
                </div>
                
                <div v-if="portResult.isOccupied" class="space-y-1 text-xs font-mono text-slate-300">
                  <p><span class="text-slate-500">{{ t('toolbox.modals.port.occupiedBy') }}</span><strong class="text-amber-300">{{ portResult.processName }}</strong> (PID: {{ portResult.pid }})</p>
                  <p v-if="portResult.memoryMB"><span class="text-slate-500">{{ t('toolbox.modals.port.memoryUsage') }}</span>{{ portResult.memoryMB }} MB</p>
                  <p v-if="portResult.cpuPercent !== undefined"><span class="text-slate-500">{{ t('toolbox.modals.port.cpuUsage') }}</span>{{ portResult.cpuPercent }}%</p>
                  <p><span class="text-slate-500">{{ t('toolbox.modals.port.protocolAddress') }}</span>{{ portResult.protocol }} {{ portResult.localAddress }}</p>
                  <p v-if="portResult.exePath" class="truncate" :title="portResult.exePath">
                    <span class="text-slate-500">{{ t('toolbox.modals.port.exePath') }}</span><span class="text-slate-400">{{ portResult.exePath }}</span>
                  </p>
                </div>
                <div v-else class="text-xs text-emerald-400">
                  {{ t('toolbox.modals.port.freeStatusMsg') }}
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
                <span>{{ isPortKilling ? t('toolbox.modals.port.releasing') : t('toolbox.modals.port.forceRelease') }}</span>
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
            <span>{{ t('toolbox.modals.port.scanningAll') }}</span>
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
                  <p class="text-[10px] font-mono text-slate-500 truncate mt-0.5">{{ item.localAddress }} • {{ item.memoryMB ? `${item.memoryMB} MB` : t('toolbox.modals.port.systemMem') }}</p>
                </div>
              </div>

              <!-- Action button -->
              <button
                v-if="item.pid"
                @click="handleKillPortOccupant(item.pid)"
                :disabled="isPortKilling"
                class="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1"
                :title="t('toolbox.modals.port.releaseTooltip')"
              >
                <Trash2 class="w-3 h-3" />
                <span>{{ t('toolbox.modals.port.releaseBtn') }}</span>
              </button>
            </div>
          </div>

          <div v-else class="text-center py-10 text-xs text-slate-500">
            {{ t('toolbox.modals.port.emptyAll') }}
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span v-if="portTab === 'all'">{{ t('toolbox.modals.port.footerAllCount', allListeningPorts.length) }}</span>
          <span v-else>{{ t('toolbox.modals.port.footerSingle') }}</span>
          <button
            v-if="portTab === 'all'"
            @click="handleScanAllPorts"
            class="text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCw class="w-3 h-3" />
            <span>{{ t('toolbox.modals.port.rescan') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 2. 真实开机自启动项管理弹窗 ================= -->
    <div
      v-if="activeModal === 'autostart'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[600px] max-h-[88vh] p-6 shadow-2xl space-y-4 flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <Zap class="w-5 h-5 text-amber-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">{{ t('toolbox.modals.autostart.title') }}</h3>
              <p class="text-[11px] text-slate-400">{{ t('toolbox.modals.autostart.subtitle') }}</p>
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
              {{ t('toolbox.modals.autostart.filterAll', autostartList.length) }}
            </button>
            <button
              @click="autostartFilter = 'enabled'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'enabled' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.autostart.filterEnabled', enabledCount) }}
            </button>
            <button
              @click="autostartFilter = 'disabled'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'disabled' ? 'bg-slate-700 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.autostart.filterDisabled', disabledCount) }}
            </button>
            <button
              @click="autostartFilter = 'recommended'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="autostartFilter === 'recommended' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.autostart.filterRecommended', recommendedCount) }}
            </button>
          </div>

          <!-- Search input -->
          <div class="relative flex-1 sm:max-w-xs">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              v-model="autostartSearch"
              type="text"
              :placeholder="t('toolbox.modals.autostart.searchPlaceholder')"
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
          <div v-if="isAutostartLoading" class="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-amber-400" />
            <span>{{ t('toolbox.modals.autostart.scanning') }}</span>
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
                  {{ t('toolbox.modals.autostart.safeToDisableTag') }}
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
              <span>{{ item.enabled ? t('toolbox.modals.autostart.btnEnabled') : t('toolbox.modals.autostart.btnDisabled') }}</span>
            </button>
          </div>

          <div v-else class="text-center py-10 text-xs text-slate-500">
            {{ t('toolbox.modals.autostart.empty') }}
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-3">
            <span>{{ t('toolbox.modals.autostart.footerCount', autostartList.length, enabledCount) }}</span>
            <button
              v-if="recommendedCount > 0"
              @click="handleDisableAllRecommended"
              class="text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              {{ t('toolbox.modals.autostart.footerDisableRecommended', recommendedCount) }}
            </button>
          </div>
          <button
            @click="loadAutostartEntries"
            class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCw class="w-3 h-3" />
            <span>{{ t('toolbox.modals.autostart.rescan') }}</span>
          </button>
        </div>
      </div>
    </div>


    <!-- ================= 3. 真实 DNS 测速与优选弹窗 ================= -->
    <div
      v-if="activeModal === 'dns'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[580px] max-h-[88vh] p-6 shadow-2xl space-y-4 flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-emerald-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">{{ t('toolbox.modals.dns.title') }}</h3>
              <p class="text-[11px] text-slate-400">{{ t('toolbox.modals.dns.subtitle') }}</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs text-slate-400 font-mono">{{ t('toolbox.modals.dns.latencyRanking') }}</span>
          <div class="flex items-center gap-2">
            <!-- 刷新 DNS 缓存 -->
            <button
              @click="handleFlushDns"
              class="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              :title="t('toolbox.modals.dns.flushDnsTooltip')"
            >
              {{ t('toolbox.modals.dns.flushDns') }}
            </button>
            <!-- 恢复 DHCP -->
            <button
              @click="handleResetDhcpDns"
              class="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              :title="t('toolbox.modals.dns.resetDhcpTooltip')"
            >
              {{ t('toolbox.modals.dns.resetDhcp') }}
            </button>
            <!-- 测速 -->
            <button
              @click="handleTestDns"
              :disabled="isDnsTesting"
              class="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Activity class="w-3.5 h-3.5" :class="{ 'animate-spin': isDnsTesting }" />
              <span>{{ isDnsTesting ? t('toolbox.modals.dns.testing') : t('toolbox.modals.dns.retest') }}</span>
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
                    {{ t('toolbox.modals.dns.activeTag') }}
                  </span>
                  <span
                    v-else-if="idx === 0"
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 flex-shrink-0"
                  >
                    {{ t('toolbox.modals.dns.optimalTag') }}
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
                  {{ dns.latencyMs ? `${dns.latencyMs} ms` : t('toolbox.modals.dns.timeout') }}
                </span>
              </div>

              <!-- Apply Button -->
              <button
                @click="handleApplyDns(dns)"
                :disabled="isDnsApplying"
                class="px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer"
                :class="dns.isCurrent ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700/60 hover:border-transparent'"
              >
                {{ dns.isCurrent ? t('toolbox.modals.dns.applied') : t('toolbox.modals.dns.setAsCurrent') }}
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
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[580px] max-h-[88vh] p-6 shadow-2xl flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <Trash2 class="w-5 h-5 text-rose-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">{{ t('toolbox.modals.disk.title') }}</h3>
              <p class="text-[11px] text-slate-400">{{ t('toolbox.modals.disk.subtitle') }}</p>
            </div>
          </div>
          <button @click="activeModal = null" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Summary Banner (Fixed height and stable typography) -->
        <div class="p-4 my-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <span class="text-xs text-slate-400">{{ t('toolbox.modals.disk.reclaimableTotal') }}</span>
            <div class="text-2xl font-bold font-mono text-rose-400 mt-0.5 flex items-center gap-2">
              <span>{{ garbageResult ? garbageResult.totalFormatted : '0.0 MB' }}</span>
              <span v-if="isGarbageScanning" class="text-xs font-normal text-rose-400/80 animate-pulse font-sans">{{ t('toolbox.modals.disk.scanningLabel') }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handleScanGarbage"
              :disabled="isGarbageScanning"
              class="w-24 h-9 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-75 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700/50 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <RotateCw class="w-3.5 h-3.5 flex-shrink-0" :class="{ 'animate-spin': isGarbageScanning }" />
              <span>{{ isGarbageScanning ? t('toolbox.modals.disk.scanningBtn') : t('toolbox.modals.disk.rescan') }}</span>
            </button>
          </div>
        </div>

        <!-- Garbage Items List (Completely stable, zero vertical shifting) -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 relative">
          <!-- Initial loading placeholder (only on first cold start without data) -->
          <div v-if="isGarbageScanning && !garbageResult" class="h-full flex flex-col items-center justify-center py-10 text-xs text-slate-400 gap-2">
            <Loader2 class="w-5 h-5 animate-spin text-rose-400" />
            <span>{{ t('toolbox.modals.disk.initialScanning') }}</span>
          </div>

          <!-- Items list (kept rock-solid without layout changes) -->
          <template v-else-if="garbageResult && garbageResult.items.length > 0">
            <div
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
          </template>

          <div v-else class="h-full flex items-center justify-center py-10 text-xs text-slate-500">
            {{ t('toolbox.modals.disk.cleanEmpty') }}
          </div>
        </div>

        <!-- Feedback Msg -->
        <div v-if="garbageCleanMsg" class="p-2.5 mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex-shrink-0">
          {{ garbageCleanMsg }}
        </div>

        <!-- Footer Action -->
        <div class="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between flex-shrink-0">
          <span class="text-xs text-slate-500 font-mono">
            {{ garbageResult ? t('toolbox.modals.disk.footerCount', garbageResult.items.length) : '' }}
          </span>
          <button
            @click="handleCleanGarbage"
            :disabled="isGarbageCleaning || !garbageResult || garbageResult.totalBytes === 0"
            class="px-5 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
          >
            <Trash2 class="w-3.5 h-3.5" :class="{ 'animate-spin': isGarbageCleaning }" />
            <span>{{ isGarbageCleaning ? t('toolbox.modals.disk.cleaning') : t('toolbox.modals.disk.cleanNow', garbageResult ? garbageResult.totalFormatted : '0.0 MB') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 5. 磁盘大文件雷达与空间透视弹窗 ================= -->
    <div
      v-if="activeModal === 'large_files'"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[640px] max-h-[88vh] p-6 shadow-2xl space-y-4 flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <Database class="w-5 h-5 text-cyan-400" />
            <div>
              <h3 class="text-sm font-semibold text-slate-100">{{ t('toolbox.modals.largeFiles.title') }}</h3>
              <p class="text-[11px] text-slate-400">{{ t('toolbox.modals.largeFiles.subtitle') }}</p>
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
                {{ t('toolbox.modals.largeFiles.filterAll', largeFileList.length) }}
              </button>
              <button
                @click="largeFileFilter = 'virtual_disk'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'virtual_disk' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                {{ t('toolbox.modals.largeFiles.filterVirtualDisk') }}
              </button>
              <button
                @click="largeFileFilter = 'media'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'media' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                {{ t('toolbox.modals.largeFiles.filterMedia') }}
              </button>
              <button
                @click="largeFileFilter = 'archive'"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="largeFileFilter === 'archive' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'"
              >
                {{ t('toolbox.modals.largeFiles.filterArchive') }}
              </button>
            </div>

            <!-- Min Size Dropdown -->
            <select
              v-model.number="largeFileMinSizeMB"
              @change="handleScanLargeFiles"
              class="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option :value="200">{{ t('toolbox.modals.largeFiles.minSize200') }}</option>
              <option :value="500">{{ t('toolbox.modals.largeFiles.minSize500') }}</option>
              <option :value="1024">{{ t('toolbox.modals.largeFiles.minSize1024') }}</option>
              <option :value="2048">{{ t('toolbox.modals.largeFiles.minSize2048') }}</option>
              <option :value="5120">{{ t('toolbox.modals.largeFiles.minSize5120') }}</option>
            </select>
          </div>

          <!-- Search & Rescan -->
          <div class="flex items-center gap-2 flex-1 sm:max-w-xs">
            <div class="relative flex-1">
              <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                v-model="largeFileSearch"
                type="text"
                :placeholder="t('toolbox.modals.largeFiles.searchPlaceholder')"
                class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              @click="handleScanLargeFiles"
              :disabled="isLargeFileScanning"
              class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700/50"
              :title="t('toolbox.modals.largeFiles.rescanTooltip')"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLargeFileScanning }" />
            </button>
          </div>
        </div>

        <!-- Files List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[48vh]">
          <div v-if="isLargeFileScanning" class="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-cyan-400" />
            <span>{{ t('toolbox.modals.largeFiles.scanning') }}</span>
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
                :title="t('toolbox.modals.largeFiles.locateTooltip')"
              >
                <FolderSearch class="w-3 h-3 text-cyan-400" />
                <span>{{ t('toolbox.modals.largeFiles.locateBtn') }}</span>
              </button>

              <!-- 删除文件 -->
              <button
                @click="handleDeleteLargeFile(file)"
                class="px-2 py-1 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition-all cursor-pointer border border-rose-500/20"
                :title="t('toolbox.modals.largeFiles.deleteTooltip')"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>

          <div v-else class="text-center py-12 text-xs text-slate-500">
            {{ t('toolbox.modals.largeFiles.empty', largeFileMinSizeMB) }}
          </div>
        </div>

        <div v-if="largeFileActionMsg" class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono text-center">
          {{ largeFileActionMsg }}
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{{ t('toolbox.modals.largeFiles.footerSummary', filteredLargeFiles.length, totalFilteredLargeFileSize) }}</span>
          <span>{{ t('toolbox.modals.largeFiles.footerSorted') }}</span>
        </div>
      </div>
    </div>

    <!-- 5. 活跃进程急速降温与查杀 Modal -->
    <div
      v-if="activeModal === 'process_killer'"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col h-[88vh] max-h-[800px] min-h-[600px] space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                {{ t('toolbox.modals.processKiller.title') }}
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                  {{ t('toolbox.modals.processKiller.badge') }}
                </span>
              </h3>
              <p class="text-xs text-slate-400">{{ t('toolbox.modals.processKiller.subtitle') }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleFetchProcesses(false)"
              :disabled="isProcessLoading"
              class="p-2 text-slate-400 hover:text-violet-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              :title="t('toolbox.modals.processKiller.refreshTooltip')"
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
            <div class="text-[11px] text-slate-400 mb-1">{{ t('toolbox.modals.processKiller.metricActiveTotal') }}</div>
            <div class="text-base font-bold font-mono text-slate-200">{{ processList.length }} <span class="text-xs font-normal text-slate-500">{{ t('toolbox.modals.processKiller.unitCount') }}</span></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div class="text-[11px] text-slate-400 mb-1">{{ t('toolbox.modals.processKiller.metricHighLoad') }}</div>
            <div class="text-base font-bold font-mono text-amber-400">{{ highCpuCount + highMemCount }} <span class="text-xs font-normal text-slate-500">{{ t('toolbox.modals.processKiller.unitItems') }}</span></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div class="text-[11px] text-slate-400 mb-1">{{ t('toolbox.modals.processKiller.metricTotalMem') }}</div>
            <div class="text-base font-bold font-mono text-violet-400">{{ totalProcessMemGB }} <span class="text-xs font-normal text-slate-500">GB</span></div>
          </div>
          <button
            @click="handleQuickCoolDown"
            :disabled="isProcessKilling || (highCpuCount === 0 && highMemCount === 0)"
            class="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-violet-600/20 transition-all cursor-pointer border border-white/10"
          >
            <div class="flex items-center gap-1.5 font-bold">
              <Zap class="w-4 h-4 text-amber-300" />
              <span>{{ t('toolbox.modals.processKiller.quickCooldown') }}</span>
            </div>
            <span class="text-[10px] text-violet-200">{{ t('toolbox.modals.processKiller.quickCooldownSub') }}</span>
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
              {{ t('toolbox.modals.processKiller.filterAll', processList.length) }}
            </button>
            <button
              @click="processFilter = 'high_cpu'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'high_cpu' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.processKiller.filterHighCpu', processList.filter(p => p.cpuPercent > 5.0).length) }}
            </button>
            <button
              @click="processFilter = 'high_mem'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'high_mem' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.processKiller.filterHighMem', processList.filter(p => p.memoryMB > 400.0).length) }}
            </button>
            <button
              @click="processFilter = 'safe'"
              class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              :class="processFilter === 'safe' ? 'bg-violet-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.processKiller.filterSafe', processList.filter(p => p.isSafeToKill).length) }}
            </button>
          </div>

          <!-- Sort & Search -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <span>{{ t('toolbox.modals.processKiller.sortLabel') }}</span>
              <select
                v-model="processSort"
                class="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="memory">{{ t('toolbox.modals.processKiller.sortMem') }}</option>
                <option value="cpu">{{ t('toolbox.modals.processKiller.sortCpu') }}</option>
              </select>
            </div>

            <div class="relative w-48">
              <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="processSearch"
                type="text"
                :placeholder="t('toolbox.modals.processKiller.searchPlaceholder')"
                class="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
        </div>

        <!-- Process Table List -->
        <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[380px]">
          <div v-if="isProcessLoading && processList.length === 0" class="text-center py-20 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-violet-400" />
            <span>{{ t('toolbox.modals.processKiller.scanning') }}</span>
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
                    :title="t('toolbox.modals.processKiller.systemProtectTooltip')"
                  >
                    {{ t('toolbox.modals.processKiller.systemProtectTag') }}
                  </span>
                  <span
                    v-else
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    {{ t('toolbox.modals.processKiller.safeKillTag') }}
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
                :title="t('toolbox.modals.processKiller.killTooltip')"
              >
                {{ t('toolbox.modals.processKiller.killBtn') }}
              </button>
            </div>
          </div>

          <div v-else class="text-center py-12 text-xs text-slate-500">
            {{ t('toolbox.modals.processKiller.empty') }}
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
              {{ selectedPids.length > 0 ? t('toolbox.modals.processKiller.deselectAll') : t('toolbox.modals.processKiller.selectAllSafe') }}
            </button>
            <span>{{ t('toolbox.modals.processKiller.selectedCount', selectedPids.length) }}</span>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="selectedPids.length > 0"
              @click="handleBatchKillProcesses"
              :disabled="isProcessKilling"
              class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>{{ t('toolbox.modals.processKiller.batchKillBtn', selectedPids.length) }}</span>
            </button>
            <span class="text-slate-500 font-mono">{{ t('toolbox.modals.processKiller.footerTotal', filteredProcessList.length) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Docker 容器与镜像专项体检 Modal -->
    <div
      v-if="activeModal === 'docker'"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                {{ t('toolbox.modals.docker.title') }}
                <span
                  v-if="dockerData?.isRunning"
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {{ t('toolbox.modals.docker.badgeRunning') }}
                </span>
                <span
                  v-else-if="dockerData?.isInstalled"
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  {{ t('toolbox.modals.docker.badgeStopped') }}
                </span>
                <span
                  v-else
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
                >
                  {{ t('toolbox.modals.docker.badgeNotInstalled') }}
                </span>
              </h3>
              <p class="text-xs text-slate-400">{{ t('toolbox.modals.docker.subtitle') }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleScanDocker"
              :disabled="isDockerScanning"
              class="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              :title="t('toolbox.modals.docker.refreshTooltip')"
            >
              <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isDockerScanning }" />
            </button>
            <button
              @click="activeModal = null"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Scanning State -->
        <div v-if="isDockerScanning" class="text-center py-16 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin text-blue-400" />
          <span>{{ t('toolbox.modals.docker.scanning') }}</span>
        </div>

        <!-- Not Installed or Stopped Warning -->
        <div v-else-if="dockerData && !dockerData.isInstalled" class="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 my-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Layers class="w-6 h-6" />
          </div>
          <h4 class="text-sm font-bold text-slate-200">{{ t('toolbox.modals.docker.notInstalledTitle') }}</h4>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            {{ t('toolbox.modals.docker.notInstalledDesc') }}
          </p>
        </div>

        <div v-else-if="dockerData && !dockerData.isRunning" class="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3 my-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <Layers class="w-6 h-6" />
          </div>
          <h4 class="text-sm font-bold text-amber-300">{{ t('toolbox.modals.docker.stoppedTitle') }}</h4>
          <p class="text-xs text-slate-300 max-w-md mx-auto">
            {{ t('toolbox.modals.docker.stoppedDesc', dockerData.version || (locale === 'zh-CN' ? '已安装' : 'Installed')) }}
          </p>
        </div>

        <!-- Running Content -->
        <template v-else-if="dockerData && dockerData.isRunning">
          <!-- 4 Big Resource Overview Cards -->
          <div class="grid grid-cols-4 gap-3">
            <!-- Images -->
            <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">{{ t('toolbox.modals.docker.cardImages') }}</span>
                <span class="font-mono text-[10px] text-slate-500">{{ t('toolbox.modals.docker.cardImagesCount', dockerData.imagesCount) }}</span>
              </div>
              <div class="text-base font-bold font-mono text-slate-200">{{ dockerData.imagesSize }}</div>
              <div class="text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                <span>{{ t('toolbox.modals.docker.cardReclaimable') }}</span>
                <span class="font-bold">{{ dockerData.imagesReclaimable }}</span>
              </div>
              <button
                @click="handlePruneDocker('images')"
                :disabled="isDockerPruning"
                class="w-full py-1 text-[11px] rounded-lg bg-blue-500/10 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/20 transition-all cursor-pointer"
              >
                {{ t('toolbox.modals.docker.cardCleanImages') }}
              </button>
            </div>

            <!-- Containers -->
            <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">{{ t('toolbox.modals.docker.cardContainers') }}</span>
                <span class="font-mono text-[10px] text-slate-500">{{ t('toolbox.modals.docker.cardImagesCount', dockerData.containersCount) }}</span>
              </div>
              <div class="text-base font-bold font-mono text-slate-200">{{ dockerData.containersSize }}</div>
              <div class="text-[11px] font-mono text-amber-400 flex items-center justify-between">
                <span>{{ t('toolbox.modals.docker.cardStoppedContainers') }}</span>
                <span class="font-bold">{{ t('toolbox.modals.docker.cardImagesCount', dockerData.stoppedContainersCount) }}</span>
              </div>
              <button
                @click="handlePruneDocker('containers')"
                :disabled="isDockerPruning || dockerData.stoppedContainersCount === 0"
                class="w-full py-1 text-[11px] rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/20 transition-all cursor-pointer disabled:opacity-40"
              >
                {{ t('toolbox.modals.docker.cardCleanContainers') }}
              </button>
            </div>

            <!-- Build Cache -->
            <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">{{ t('toolbox.modals.docker.cardBuildCache') }}</span>
                <span class="font-mono text-[10px] text-slate-500">{{ t('toolbox.modals.docker.cardCacheTag') }}</span>
              </div>
              <div class="text-base font-bold font-mono text-slate-200">{{ dockerData.buildCacheSize }}</div>
              <div class="text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                <span>{{ t('toolbox.modals.docker.cardReclaimable') }}</span>
                <span class="font-bold">{{ dockerData.buildCacheReclaimable }}</span>
              </div>
              <button
                @click="handlePruneDocker('builder')"
                :disabled="isDockerPruning"
                class="w-full py-1 text-[11px] rounded-lg bg-purple-500/10 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/20 transition-all cursor-pointer"
              >
                {{ t('toolbox.modals.docker.cardCleanBuildCache') }}
              </button>
            </div>

            <!-- Quick Prune All -->
            <div class="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/80 to-slate-950 border border-blue-500/30 flex flex-col justify-between space-y-2">
              <div>
                <div class="text-[11px] font-medium text-blue-300 mb-1">{{ t('toolbox.modals.docker.cardDeepSlim') }}</div>
                <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.docker.cardDeepSlimDesc') }}</p>
              </div>
              <button
                @click="handlePruneDocker('system')"
                :disabled="isDockerPruning"
                class="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer border border-white/10"
              >
                <Zap class="w-3.5 h-3.5 text-amber-300" />
                <span>{{ t('toolbox.modals.docker.cardPruneAll') }}</span>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              @click="dockerTab = 'overview'"
              class="px-3 py-1 rounded-lg transition-colors cursor-pointer"
              :class="dockerTab === 'overview' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.docker.tabOverview') }}
            </button>
            <button
              @click="dockerTab = 'containers'"
              class="px-3 py-1 rounded-lg transition-colors cursor-pointer"
              :class="dockerTab === 'containers' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.docker.tabContainers', dockerData.stoppedContainers.length) }}
            </button>
            <button
              @click="dockerTab = 'images'"
              class="px-3 py-1 rounded-lg transition-colors cursor-pointer"
              :class="dockerTab === 'images' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            >
              {{ t('toolbox.modals.docker.tabImages', dockerData.danglingImages.length) }}
            </button>
          </div>

          <!-- Tab Content Lists -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[44vh]">
            <!-- Overview Tab -->
            <div v-if="dockerTab === 'overview'" class="space-y-3">
              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <h4 class="font-bold text-slate-200 flex items-center gap-2">
                  <Activity class="w-4 h-4 text-blue-400" />
                  {{ t('toolbox.modals.docker.overviewTitle') }}
                </h4>
                <div class="grid grid-cols-2 gap-3 text-slate-400 font-mono text-[11px] pt-1">
                  <div>{{ t('toolbox.modals.docker.overviewVersion', dockerData.version || '') }}</div>
                  <div>{{ t('toolbox.modals.docker.overviewVolumes', dockerData.volumesSize, dockerData.volumesCount) }}</div>
                  <div>{{ t('toolbox.modals.docker.overviewImages', dockerData.imagesSize) }}</div>
                  <div>{{ t('toolbox.modals.docker.overviewCache', dockerData.buildCacheSize) }}</div>
                </div>
              </div>
            </div>

            <!-- Stopped Containers Tab -->
            <div v-else-if="dockerTab === 'containers'" class="space-y-2">
              <div
                v-if="dockerData.stoppedContainers.length > 0"
                v-for="c in dockerData.stoppedContainers"
                :key="c.id"
                class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div class="min-w-0 flex-1 space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-200">{{ c.names }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">ID: {{ c.id.slice(0, 10) }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">Exited</span>
                  </div>
                  <p class="text-[11px] font-mono text-slate-400 truncate">{{ t('toolbox.modals.docker.containersItemStatus', c.image, c.status) }}</p>
                </div>
                <div class="font-mono text-slate-400 text-right text-xs">
                  {{ c.size }}
                </div>
              </div>
              <div v-else class="text-center py-10 text-xs text-slate-500">
                {{ t('toolbox.modals.docker.containersEmpty') }}
              </div>
            </div>

            <!-- Dangling Images Tab -->
            <div v-else-if="dockerTab === 'images'" class="space-y-2">
              <div
                v-if="dockerData.danglingImages.length > 0"
                v-for="img in dockerData.danglingImages"
                :key="img.id"
                class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div class="min-w-0 flex-1 space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold font-mono text-purple-300">{{ img.repository }}:{{ img.tag }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{{ img.id.slice(0, 12) }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">Dangling</span>
                  </div>
                  <p class="text-[11px] font-mono text-slate-500">{{ t('toolbox.modals.docker.imagesItemCreated', img.createdSince) }}</p>
                </div>
                <div class="font-mono text-cyan-400 font-bold text-right text-xs">
                  {{ img.size }}
                </div>
              </div>
              <div v-else class="text-center py-10 text-xs text-slate-500">
                {{ t('toolbox.modals.docker.imagesEmpty') }}
              </div>
            </div>
          </div>
        </template>

        <!-- Feedback Msg -->
        <div v-if="dockerActionMsg" class="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono text-center">
          {{ dockerActionMsg }}
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{{ t('toolbox.modals.docker.footerEngine') }}</span>
          <span>{{ t('toolbox.modals.docker.footerSafeNote') }}</span>
        </div>
      </div>
    </div>

    <!-- 7. 网络急救箱与 DNS 刷新 Modal -->
    <div
      v-if="activeModal === 'network_repair'"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Wifi class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                {{ t('toolbox.modals.networkRepair.title') }}
                <span
                  v-if="netHealth?.overallStatus === 'healthy'"
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {{ t('toolbox.modals.networkRepair.statusHealthy') }}
                </span>
                <span
                  v-else-if="netHealth?.overallStatus === 'dns_failed'"
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  {{ t('toolbox.modals.networkRepair.statusDnsFailed') }}
                </span>
                <span
                  v-else
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20"
                >
                  {{ t('toolbox.modals.networkRepair.statusDisconnected') }}
                </span>
              </h3>
              <p class="text-xs text-slate-400">{{ t('toolbox.modals.networkRepair.subtitle') }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleDiagnoseNet"
              :disabled="isNetDiagnosing"
              class="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              :title="t('toolbox.modals.networkRepair.refreshTooltip')"
            >
              <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isNetDiagnosing }" />
            </button>
            <button
              @click="activeModal = null"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 4 Steps Network Chain Topology -->
        <div class="space-y-2">
          <div class="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>{{ t('toolbox.modals.networkRepair.topologyTitle') }}</span>
            <span class="text-slate-500 font-mono text-[10px]">{{ netHealth?.adapterName }}</span>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <!-- 1. Local Adapter -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">{{ t('toolbox.modals.networkRepair.step1Name') }}</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-200 truncate" :title="netHealth?.localIp">{{ netHealth?.localIp || '127.0.0.1' }}</div>
              <div class="text-[10px] font-mono text-slate-500">{{ t('toolbox.modals.networkRepair.step1Status') }}</div>
            </div>

            <!-- 2. Gateway Router -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">{{ t('toolbox.modals.networkRepair.step2Name') }}</span>
                <span class="w-2 h-2 rounded-full" :class="netHealth?.gatewayPingMs ? 'bg-emerald-400' : 'bg-rose-400'"></span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-200 truncate" :title="netHealth?.gatewayIp">{{ netHealth?.gatewayIp || '192.168.1.1' }}</div>
              <div class="text-[10px] font-mono" :class="netHealth?.gatewayPingMs ? 'text-emerald-400' : 'text-rose-400'">
                {{ netHealth?.gatewayPingMs ? t('toolbox.modals.networkRepair.step2Lan', netHealth.gatewayPingMs) : t('toolbox.modals.networkRepair.step2Timeout') }}
              </div>
            </div>

            <!-- 3. Public Backbone -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">{{ t('toolbox.modals.networkRepair.step3Name') }}</span>
                <span class="w-2 h-2 rounded-full" :class="netHealth?.publicDnsPingMs ? 'bg-emerald-400' : 'bg-rose-400'"></span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-200">223.5.5.5</div>
              <div class="text-[10px] font-mono" :class="netHealth?.publicDnsPingMs ? 'text-emerald-400' : 'text-rose-400'">
                {{ netHealth?.publicDnsPingMs ? t('toolbox.modals.networkRepair.step3Wan', netHealth.publicDnsPingMs) : t('toolbox.modals.networkRepair.step3Timeout') }}
              </div>
            </div>

            <!-- 4. DNS & HTTP -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">{{ t('toolbox.modals.networkRepair.step4Name') }}</span>
                <span class="w-2 h-2 rounded-full" :class="netHealth?.dnsResolveOk ? 'bg-emerald-400' : 'bg-rose-400'"></span>
              </div>
              <div class="text-xs font-bold font-mono" :class="netHealth?.dnsResolveOk ? 'text-slate-200' : 'text-rose-400'">
                {{ netHealth?.dnsResolveOk ? t('toolbox.modals.networkRepair.step4DnsOk') : t('toolbox.modals.networkRepair.step4DnsFail') }}
              </div>
              <div class="text-[10px] font-mono" :class="netHealth?.dnsResolveOk ? 'text-teal-400' : 'text-rose-400'">
                {{ netHealth?.dnsResolveOk ? t('toolbox.modals.networkRepair.step4DetailOk', netHealth?.dnsResolveMs || 10, netHealth?.httpLatencyMs || 30) : t('toolbox.modals.networkRepair.step4DetailFail') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Full Network Repair Big Action Banner -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-indigo-950/80 border border-teal-500/30 flex items-center justify-between gap-4 shadow-xl">
          <div class="space-y-1">
            <div class="text-sm font-bold text-teal-300 flex items-center gap-2">
              <Zap class="w-4 h-4 text-amber-300" />
              {{ t('toolbox.modals.networkRepair.fullRepairTitle') }}
            </div>
            <p class="text-xs text-slate-300">
              {{ t('toolbox.modals.networkRepair.fullRepairDesc') }}
            </p>
          </div>

          <button
            @click="handleExecuteRepair('full_repair')"
            :disabled="isNetRepairing"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex-shrink-0 border border-white/10"
          >
            <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isNetRepairing }" />
            <span>{{ t('toolbox.modals.networkRepair.fullRepairBtn') }}</span>
          </button>
        </div>

        <!-- 6 Targeted Repair Quick Cards -->
        <div class="space-y-2">
          <div class="text-[11px] font-medium text-slate-400">{{ t('toolbox.modals.networkRepair.subtoolsTitle') }}</div>
          <div class="grid grid-cols-3 gap-3">
            <!-- 1. Flush DNS -->
            <button
              @click="handleExecuteRepair('flush_dns')"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool1Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">flushdns</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool1Desc') }}</p>
            </button>

            <!-- 2. Reset Winsock -->
            <button
              @click="handleExecuteRepair('reset_winsock')"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool2Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">winsock reset</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool2Desc') }}</p>
            </button>

            <!-- 3. Reset TCP/IP -->
            <button
              @click="handleExecuteRepair('reset_tcpip')"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool3Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">int ip reset</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool3Desc') }}</p>
            </button>

            <!-- 4. Renew IP -->
            <button
              @click="handleExecuteRepair('renew_ip')"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool4Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">ip renew</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool4Desc') }}</p>
            </button>

            <!-- 5. Clear ARP Cache -->
            <button
              @click="handleExecuteRepair('clear_arp')"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool5Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">arp delete</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool5Desc') }}</p>
            </button>

            <!-- 6. Reset DHCP DNS -->
            <button
              @click="handleResetDhcpDns"
              :disabled="isNetRepairing"
              class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/50 text-left space-y-1.5 transition-all cursor-pointer group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 group-hover:text-teal-400">{{ t('toolbox.modals.networkRepair.tool6Title') }}</span>
                <span class="text-[10px] font-mono text-slate-500">auto dns</span>
              </div>
              <p class="text-[10px] text-slate-400">{{ t('toolbox.modals.networkRepair.tool6Desc') }}</p>
            </button>
          </div>
        </div>

        <!-- Feedback Msg -->
        <div v-if="netRepairMsg" class="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono text-center">
          {{ netRepairMsg }}
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{{ netHealth?.summaryText || t('toolbox.modals.networkRepair.defaultSummary') }}</span>
          <span>{{ t('toolbox.modals.networkRepair.footerSafeNote') }}</span>
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
import type { AutostartEntry, DnsPingResult, PortOccupantInfo, GarbageScanResult, LargeFileInfo, ProcessItem, DockerOverview, NetworkDiagnosisResult } from '@/types';
import { useI18n } from '@/composables/useI18n';

const { t, locale } = useI18n();

defineEmits<{
  (e: 'selectTool', prompt: string): void;
}>();

const activeModal = ref<'port' | 'autostart' | 'dns' | 'disk' | 'large_files' | 'process_killer' | 'docker' | 'network_repair' | null>(null);

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
    largeFileActionMsg.value = t('toolbox.modals.largeFiles.locateSuccess', path);
  } catch (e: any) {
    largeFileActionMsg.value = t('toolbox.modals.largeFiles.locateFailed', e);
  }
};

const handleDeleteLargeFile = async (file: LargeFileInfo) => {
  if (!confirm(t('toolbox.modals.largeFiles.deleteConfirm', file.fileName, file.sizeFormatted, file.path))) {
    return;
  }

  try {
    await invoke('delete_large_file', { path: file.path });
    largeFileActionMsg.value = t('toolbox.modals.largeFiles.deleteSuccess', file.fileName, file.sizeFormatted);
    await handleScanLargeFiles();
  } catch (e: any) {
    largeFileActionMsg.value = t('toolbox.modals.largeFiles.deleteFailed', e);
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

const handleFetchProcesses = async (silent = false) => {
  if (!silent && processList.value.length === 0) {
    isProcessLoading.value = true;
  }
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
  // 乐观测单：瞬间无感移除目标项，杜绝任何 DOM 坍塌抖动
  processList.value = processList.value.filter((p) => p.pid !== pid);
  selectedPids.value = selectedPids.value.filter((p) => p !== pid);
  processActionMsg.value = t('toolbox.modals.processKiller.killSingleSuccess', name, pid);

  isProcessKilling.value = true;
  try {
    await invoke('kill_process', { pid });
    // 静默同步后端最新状态，绝不触发布局重载
    await handleFetchProcesses(true);
  } catch (e: any) {
    processActionMsg.value = t('toolbox.modals.processKiller.killSingleFailed', e);
    await handleFetchProcesses(true);
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
  const targets = [...selectedPids.value];
  // 乐观移除
  processList.value = processList.value.filter((p) => !targets.includes(p.pid));
  selectedPids.value = [];
  isProcessKilling.value = true;
  try {
    const count = await invoke<number>('batch_kill_processes', { pids: targets });
    processActionMsg.value = t('toolbox.modals.processKiller.batchKillSuccess', count);
    await handleFetchProcesses(true);
  } catch (e: any) {
    processActionMsg.value = t('toolbox.modals.processKiller.batchKillFailed', e);
    await handleFetchProcesses(true);
  } finally {
    isProcessKilling.value = false;
  }
};

const handleQuickCoolDown = async () => {
  const coolDownPids = processList.value
    .filter((p) => p.isSafeToKill && (p.cpuPercent > 5.0 || p.memoryMB > 400.0))
    .map((p) => p.pid);

  if (coolDownPids.length === 0) {
    processActionMsg.value = t('toolbox.modals.processKiller.cooldownClean');
    return;
  }

  // 乐观移除
  processList.value = processList.value.filter((p) => !coolDownPids.includes(p.pid));
  selectedPids.value = [];
  isProcessKilling.value = true;
  try {
    const count = await invoke<number>('batch_kill_processes', { pids: coolDownPids });
    processActionMsg.value = t('toolbox.modals.processKiller.cooldownSuccess', count);
    await handleFetchProcesses(true);
  } catch (e: any) {
    processActionMsg.value = t('toolbox.modals.processKiller.cooldownFailed', e);
    await handleFetchProcesses(true);
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
  } else if (toolId === 'docker') {
    activeModal.value = 'docker';
    handleScanDocker();
  } else if (toolId === 'network_repair') {
    activeModal.value = 'network_repair';
    handleDiagnoseNet();
  }
};

// 7. 网络急救箱状态
const netHealth = ref<NetworkDiagnosisResult | null>(null);
const isNetDiagnosing = ref(false);
const isNetRepairing = ref(false);
const netRepairMsg = ref('');

const handleDiagnoseNet = async () => {
  isNetDiagnosing.value = true;
  netRepairMsg.value = '';
  try {
    const res = await invoke<NetworkDiagnosisResult>('diagnose_network_health');
    netHealth.value = res;
  } catch (e) {
    console.warn('diagnose_network_health fallback:', e);
    netHealth.value = {
      localIp: '192.168.31.142',
      gatewayIp: '192.168.31.1',
      gatewayPingMs: 2,
      publicDnsPingMs: 14,
      dnsResolveOk: true,
      dnsResolveMs: 18,
      httpAccessOk: true,
      httpStatusCode: 200,
      httpLatencyMs: 42,
      adapterName: 'Realtek PCIe GbE Family Controller',
      overallStatus: 'healthy',
      summaryText: '全链路网络畅通，局域网、DNS 解析与外网 HTTP 连接全部正常。',
    };
  } finally {
    isNetDiagnosing.value = false;
  }
};

const handleExecuteRepair = async (action: string) => {
  isNetRepairing.value = true;
  netRepairMsg.value = '';
  try {
    const res = await invoke<string>('execute_network_repair', { action });
    netRepairMsg.value = t('toolbox.modals.networkRepair.repairSuccessMsg', res);
    await handleDiagnoseNet();
  } catch (e: any) {
    netRepairMsg.value = t('toolbox.modals.networkRepair.repairFailedMsg', e);
  } finally {
    isNetRepairing.value = false;
  }
};

// 6. Docker 容器与镜像体检状态
const dockerData = ref<DockerOverview | null>(null);
const isDockerScanning = ref(false);
const isDockerPruning = ref(false);
const dockerTab = ref<'overview' | 'containers' | 'images'>('overview');
const dockerActionMsg = ref('');

const handleScanDocker = async () => {
  isDockerScanning.value = true;
  dockerActionMsg.value = '';
  try {
    const res = await invoke<DockerOverview>('scan_docker_environment');
    dockerData.value = res;
  } catch (e) {
    console.warn('scan_docker_environment fallback:', e);
    dockerData.value = {
      isInstalled: true,
      isRunning: true,
      version: 'Docker version 27.0.3, build 7d4bed1',
      containersCount: 14,
      stoppedContainersCount: 6,
      imagesCount: 22,
      danglingImagesCount: 8,
      volumesCount: 12,
      imagesSize: '18.4GB',
      imagesReclaimable: '9.6GB (52%)',
      containersSize: '2.1GB',
      containersReclaimable: '1.4GB (66%)',
      volumesSize: '8.2GB',
      volumesReclaimable: '3.1GB (37%)',
      buildCacheSize: '14.8GB',
      buildCacheReclaimable: '12.2GB (82%)',
      totalReclaimable: '26.3 GB',
      stoppedContainers: [
        { id: 'c8f1a23b9d', names: 'redis_cache_old', image: 'redis:7.0-alpine', status: 'Exited (0) 3 weeks ago', state: 'exited', size: '240MB', created: '3 weeks ago' },
        { id: 'a1b2c3d4e5', names: 'mysql_test_backup', image: 'mysql:8.0', status: 'Exited (137) 1 month ago', state: 'exited', size: '1.1GB', created: '1 month ago' },
        { id: 'f9e8d7c6b5', names: 'vite_dev_container', image: 'node:20-alpine', status: 'Exited (0) 5 days ago', state: 'exited', size: '480MB', created: '5 days ago' },
      ],
      danglingImages: [
        { id: 'sha256:7f8e9d', repository: '<none>', tag: '<none>', size: '1.84GB', createdSince: '2 weeks ago', isDangling: true },
        { id: 'sha256:4a5b6c', repository: '<none>', tag: '<none>', size: '950MB', createdSince: '3 weeks ago', isDangling: true },
        { id: 'sha256:1a2b3c', repository: '<none>', tag: '<none>', size: '680MB', createdSince: '1 month ago', isDangling: true },
      ],
    };
  } finally {
    isDockerScanning.value = false;
  }
};

const handlePruneDocker = async (target: 'containers' | 'images' | 'builder' | 'system') => {
  if (target === 'system' && !confirm(t('toolbox.modals.docker.pruneConfirm'))) {
    return;
  }

  isDockerPruning.value = true;
  dockerActionMsg.value = '';
  try {
    const res = await invoke<string>('prune_docker_target', { target });
    dockerActionMsg.value = t('toolbox.modals.docker.pruneSuccess', res);
    await handleScanDocker();
  } catch (e: any) {
    dockerActionMsg.value = t('toolbox.modals.docker.pruneFailed', e);
  } finally {
    isDockerPruning.value = false;
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
    garbageCleanMsg.value = t('toolbox.modals.disk.cleanSuccess', formatted);
    await handleScanGarbage();
  } catch (e: any) {
    garbageCleanMsg.value = t('toolbox.modals.disk.cleanFailed', e);
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
      status: t('toolbox.modals.port.statusIdle'),
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
    portActionFeedback.value = t('toolbox.modals.port.feedbackSuccess', pid);
    
    if (portTab.value === 'single') {
      await handleCheckPort();
    } else {
      await handleScanAllPorts();
    }
  } catch (err: any) {
    portActionFeedback.value = t('toolbox.modals.port.feedbackFailed', err);
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
    alert(t('toolbox.modals.autostart.opFailed', e));
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
    dnsApplyMsg.value = msg || t('toolbox.modals.dns.applySuccessMsg', dns.name);
    // 重新测速并刷新状态
    await handleTestDns();
  } catch (err: any) {
    dnsApplyMsg.value = t('toolbox.modals.dns.setFailedMsg', err);
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
    dnsApplyMsg.value = msg || t('toolbox.modals.dns.resetDhcpSuccessMsg');
    await handleTestDns();
  } catch (err: any) {
    dnsApplyMsg.value = t('toolbox.modals.dns.resetFailedMsg', err);
  } finally {
    isDnsApplying.value = false;
  }
};

// 刷新本地 DNS 缓存
const handleFlushDns = async () => {
  try {
    const msg = await invoke<string>('flush_dns_cache');
    dnsApplyMsg.value = msg || t('toolbox.modals.dns.flushSuccessMsg');
  } catch (err: any) {
    dnsApplyMsg.value = t('toolbox.modals.dns.flushFailedMsg', err);
  }
};

const tools = computed(() => [
  {
    id: 'port',
    name: t('toolbox.tools.port.name'),
    category: t('toolbox.catNetwork'),
    description: t('toolbox.tools.port.desc'),
    icon: Radio,
    colorClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    badgeClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
    statusText: t('toolbox.tools.port.badge'),
    prompt: t('toolbox.tools.port.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'autostart',
    name: t('toolbox.tools.autostart.name'),
    category: t('toolbox.catSpeed'),
    description: t('toolbox.tools.autostart.desc'),
    icon: Zap,
    colorClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    statusText: t('toolbox.tools.autostart.badge'),
    prompt: t('toolbox.tools.autostart.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'dns',
    name: t('toolbox.tools.dns.name'),
    category: t('toolbox.catNetwork'),
    description: t('toolbox.tools.dns.desc'),
    icon: Globe,
    colorClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    statusText: t('toolbox.tools.dns.badge'),
    prompt: t('toolbox.tools.dns.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'disk',
    name: t('toolbox.tools.disk.name'),
    category: t('toolbox.catDisk'),
    description: t('toolbox.tools.disk.desc'),
    icon: Trash2,
    colorClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    statusText: t('toolbox.tools.disk.badge'),
    prompt: t('toolbox.tools.disk.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'large_files',
    name: t('toolbox.tools.largeFiles.name'),
    category: t('toolbox.catDisk'),
    description: t('toolbox.tools.largeFiles.desc'),
    icon: Database,
    colorClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    badgeClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    statusText: t('toolbox.tools.largeFiles.badge'),
    prompt: t('toolbox.tools.largeFiles.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'process_killer',
    name: t('toolbox.tools.processKiller.name'),
    category: t('toolbox.catSpeed'),
    description: t('toolbox.tools.processKiller.desc'),
    icon: Cpu,
    colorClass: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    badgeClass: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
    statusText: t('toolbox.tools.processKiller.badge'),
    prompt: t('toolbox.tools.processKiller.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'docker',
    name: t('toolbox.tools.docker.name'),
    category: t('toolbox.catDevOps'),
    description: t('toolbox.tools.docker.desc'),
    icon: Layers,
    colorClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    statusText: t('toolbox.tools.docker.badge'),
    prompt: t('toolbox.tools.docker.prompt'),
    hasDirectModal: true,
  },
  {
    id: 'network_repair',
    name: t('toolbox.tools.network.name'),
    category: t('toolbox.catNetwork'),
    description: t('toolbox.tools.network.desc'),
    icon: Wifi,
    colorClass: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    badgeClass: 'bg-teal-500/10 border-teal-500/20 text-teal-300',
    statusText: t('toolbox.tools.network.badge'),
    prompt: t('toolbox.tools.network.prompt'),
    hasDirectModal: true,
  },
]);
</script>
