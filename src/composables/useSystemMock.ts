import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { SystemMetrics, ProcessItem } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export function useSystemMock() {
  const isTauriEnv = ref(false);

  const metrics = reactive<SystemMetrics>({
    healthScore: 88,
    healthStatus: 'optimal',
    cpuUsage: 18.5,
    cpuTemp: 52,
    memoryUsedGB: 8.2,
    memoryTotalGB: 16.0,
    memoryUsagePercent: 51,
    diskUsedGB: 280,
    diskTotalGB: 512,
    diskUsagePercent: 54,
    networkUpKBps: 45,
    networkDownKBps: 1250,
    uptimeHours: 12.4,
    processCount: 180,
  });

  const processes = ref<ProcessItem[]>([
    { pid: 14820, name: 'electron_crash_dump.exe', cpuPercent: 32.4, memoryMB: 4850, status: 'unresponsive', isSafeToKill: true, category: 'user' },
    { pid: 21044, name: 'chrome.exe (Tab: Heavy WebGL)', cpuPercent: 18.2, memoryMB: 2340, status: 'running', isSafeToKill: true, category: 'user' },
    { pid: 8940, name: 'idea64.exe (Indexing)', cpuPercent: 12.8, memoryMB: 3120, status: 'running', isSafeToKill: false, category: 'user' },
    { pid: 1044, name: 'SearchIndexer.exe', cpuPercent: 6.4, memoryMB: 450, status: 'running', isSafeToKill: true, category: 'background' },
    { pid: 4892, name: 'Docker Desktop backend', cpuPercent: 4.1, memoryMB: 1850, status: 'running', isSafeToKill: true, category: 'background' },
    { pid: 6120, name: 'node.exe (Dev Server)', cpuPercent: 2.8, memoryMB: 680, status: 'running', isSafeToKill: true, category: 'user' },
    { pid: 780, name: 'System (Kernel & NT)', cpuPercent: 1.2, memoryMB: 280, status: 'running', isSafeToKill: false, category: 'system' },
    { pid: 3412, name: 'explorer.exe', cpuPercent: 0.8, memoryMB: 320, status: 'running', isSafeToKill: false, category: 'system' },
  ]);

  let timer: any = null;

  // 尝试从真实 Tauri Rust 探针采集指标
  const refreshFromTauri = async () => {
    try {
      const realMetrics = await invoke<any>('get_system_metrics');
      if (realMetrics) {
        isTauriEnv.value = true;
        metrics.healthScore = realMetrics.healthScore ?? metrics.healthScore;
        metrics.healthStatus = realMetrics.healthStatus ?? metrics.healthStatus;
        metrics.cpuUsage = realMetrics.cpuUsage ?? metrics.cpuUsage;
        metrics.cpuCores = realMetrics.cpuCores ?? realMetrics.cpu_cores ?? metrics.cpuCores;
        metrics.physicalCores = realMetrics.physicalCores ?? realMetrics.physical_cores ?? metrics.physicalCores;
        metrics.cpuTemp = realMetrics.cpuTemp ?? metrics.cpuTemp;

        
        // 内存 (双向兼容)
        metrics.memoryUsedGB = realMetrics.memoryUsedGB ?? realMetrics.memoryUsedGb ?? metrics.memoryUsedGB;
        metrics.memoryTotalGB = realMetrics.memoryTotalGB ?? realMetrics.memoryTotalGb ?? metrics.memoryTotalGB;
        metrics.memoryUsagePercent = realMetrics.memoryUsagePercent ?? metrics.memoryUsagePercent;

        // 系统盘 (双向兼容)
        metrics.primaryDiskName = realMetrics.primaryDiskName ?? '系统盘 (C:)';
        metrics.diskUsedGB = realMetrics.primaryDiskUsedGB ?? realMetrics.primaryDiskUsedGb ?? metrics.diskUsedGB;
        metrics.diskTotalGB = realMetrics.primaryDiskTotalGB ?? realMetrics.primaryDiskTotalGb ?? metrics.diskTotalGB;
        metrics.diskUsagePercent = realMetrics.primaryDiskUsagePercent ?? metrics.diskUsagePercent;

        // 网络与系统信息
        metrics.networkUpKBps = realMetrics.networkUpKBps ?? realMetrics.networkUpKbps ?? metrics.networkUpKBps;
        metrics.networkDownKBps = realMetrics.networkDownKBps ?? realMetrics.networkDownKbps ?? metrics.networkDownKBps;
        metrics.uptimeHours = realMetrics.uptimeHours ?? metrics.uptimeHours;
        metrics.processCount = realMetrics.processCount ?? metrics.processCount;
        metrics.osName = realMetrics.osName;
        metrics.hostName = realMetrics.hostName;
      }

      const realProcs = await invoke<any[]>('get_process_list', { limit: 30 });
      if (realProcs && realProcs.length > 0) {
        processes.value = realProcs.map(p => ({
          pid: p.pid,
          name: p.name,
          cpuPercent: p.cpuPercent ?? p.cpu_percent ?? 0,
          memoryMB: p.memoryMB ?? p.memoryMb ?? p.memory_mb ?? 0,
          status: p.status || 'running',
          isSafeToKill: p.isSafeToKill ?? p.is_safe_to_kill ?? true,
          category: p.category || 'user',
          exePath: p.exePath || p.exe_path,
        }));
      }
    } catch {
      // 浏览器环境 fallback 到本地模拟动态波动
      updateFluctuations();
    }
  };


  const updateFluctuations = () => {
    const deltaCpu = (Math.random() - 0.5) * 4;
    metrics.cpuUsage = Math.max(10, Math.min(99, Math.round((metrics.cpuUsage + deltaCpu) * 10) / 10));

    const deltaNetDown = (Math.random() - 0.5) * 400;
    metrics.networkDownKBps = Math.max(50, Math.round(metrics.networkDownKBps + deltaNetDown));

    const deltaNetUp = (Math.random() - 0.5) * 50;
    metrics.networkUpKBps = Math.max(10, Math.round(metrics.networkUpKBps + deltaNetUp));
  };

  onMounted(() => {
    refreshFromTauri();
    timer = setInterval(refreshFromTauri, 2000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  // Action: 结束进程 (支持真实 Tauri 与 Mock 联动)
  const killProcess = async (pid: number) => {
    try {
      if (isTauriEnv.value) {
        await invoke('kill_process', { pid });
        await refreshFromTauri();
        return true;
      }
    } catch (e) {
      console.warn('Tauri killProcess fallback:', e);
    }

    const targetIndex = processes.value.findIndex(p => p.pid === pid);
    if (targetIndex !== -1) {
      const p = processes.value[targetIndex];
      processes.value.splice(targetIndex, 1);
      
      const freedGB = p.memoryMB / 1024;
      metrics.memoryUsedGB = Math.max(4.0, Math.round((metrics.memoryUsedGB - freedGB) * 10) / 10);
      metrics.memoryUsagePercent = Math.round((metrics.memoryUsedGB / metrics.memoryTotalGB) * 100);
      metrics.cpuUsage = Math.max(12, Math.round(metrics.cpuUsage - p.cpuPercent));
      metrics.processCount -= 1;
      
      recalculateHealth();
      return true;
    }
    return false;
  };

  // Action: 清理垃圾
  const cleanDiskGarbage = async (freedGB: number = 8.5) => {
    try {
      if (isTauriEnv.value) {
        await invoke('clean_system_garbage');
        await refreshFromTauri();
        return;
      }
    } catch (e) {
      console.warn('Tauri cleanGarbage fallback:', e);
    }

    metrics.diskUsedGB = Math.max(50, Math.round((metrics.diskUsedGB - freedGB) * 10) / 10);
    metrics.diskUsagePercent = Math.round((metrics.diskUsedGB / metrics.diskTotalGB) * 100);
    recalculateHealth();
  };

  // Action: 刷新网络
  const resetNetworkState = async () => {
    try {
      if (isTauriEnv.value) {
        await invoke('flush_dns_cache');
        await refreshFromTauri();
        return;
      }
    } catch (e) {
      console.warn('Tauri flushDns fallback:', e);
    }

    metrics.networkDownKBps = 5820;
    metrics.networkUpKBps = 890;
    recalculateHealth();
  };

  const recalculateHealth = () => {
    let penalty = 0;
    if (metrics.cpuUsage > 80) penalty += 25;
    else if (metrics.cpuUsage > 50) penalty += 10;

    if (metrics.memoryUsagePercent > 85) penalty += 25;
    else if (metrics.memoryUsagePercent > 70) penalty += 10;

    if (metrics.diskUsagePercent > 90) penalty += 25;
    else if (metrics.diskUsagePercent > 75) penalty += 10;

    const hasUnresponsive = processes.value.some(p => p.status === 'unresponsive');
    if (hasUnresponsive) penalty += 15;

    metrics.healthScore = Math.max(20, Math.min(100, 100 - penalty));
    if (metrics.healthScore >= 85) metrics.healthStatus = 'optimal';
    else if (metrics.healthScore >= 65) metrics.healthStatus = 'warning';
    else metrics.healthStatus = 'critical';
  };

  return {
    metrics,
    processes,
    isTauriEnv,
    killProcess,
    cleanDiskGarbage,
    resetNetworkState,
    recalculateHealth,
  };
}
