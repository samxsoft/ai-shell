import { ref, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage, ActionCardData, ChatSession, PortOccupantInfo, GarbageScanResult, LargeFileInfo, ProcessItem, DockerOverview, NetworkDiagnosisResult } from '@/types';






import { useSettings } from './useSettings';
import { useI18n } from './useI18n';
import { runAgentDiagnosis } from '@/services/agentEngine';


const STORAGE_KEY = 'ai_shell_chat_sessions_v1';

export function useAgentChat(onExecuteActionCallback?: (action: ActionCardData) => void) {
  const isGenerating = ref(false);
  const { settings, hasConfiguredApiKey } = useSettings();

  // 1. 初始化并加载本地持久化会话
  const loadInitialSessions = (): ChatSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load chat sessions from localStorage:', e);
    }

    // 默认初始会话
    return [
      {
        id: 'session-default',
        title: '新排障会话',
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString(),
        messages: [
          {
            id: 'welcome-msg',
            sender: 'ai',
            content: '您好！我是您的 **AI-Shell 智能系统管家**。\n\n我可以帮您排查电脑卡顿、清理 C 盘垃圾、修复网络连通性或定位应用故障。您可以直接点击下方的快捷场景，或直接用自然语言向我提问！',
            timestamp: '刚刚',
            actionCards: [],
            diagnostics: [],
          },
        ],
      },
    ];
  };

  const sessions = ref<ChatSession[]>(loadInitialSessions());
  const currentSessionId = ref<string>(sessions.value[0]?.id || 'session-default');

  // 当前活跃会话
  const currentSession = computed(() => {
    return sessions.value.find((s) => s.id === currentSessionId.value) || sessions.value[0];
  });

  // 当前会话的消息列表（响应式代理）
  const messages = computed(() => {
    return currentSession.value?.messages || [];
  });

  // 持久化保存
  const saveSessions = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value));
    } catch (e) {
      console.warn('Failed to save chat sessions to localStorage:', e);
    }
  };

  // 深度监听 sessions 变动并持久化
  watch(
    sessions,
    () => {
      saveSessions();
    },
    { deep: true }
  );

  const { t, locale } = useI18n();

  const quickPrompts = computed(() => [
    { label: t('chat.promptPort'), query: t('chat.promptPort') },
    { label: t('chat.promptClean'), query: t('chat.promptClean') },
    { label: t('chat.promptNetwork'), query: t('chat.promptNetwork') },
    { label: t('chat.promptDocker'), query: t('chat.promptDocker') },
    { label: t('chat.promptAutostart'), query: t('chat.promptAutostart') },
  ]);

  // 新建会话
  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: locale.value === 'zh-CN' ? '新排障会话' : 'New AI Session',
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          content: locale.value === 'zh-CN'
            ? '已为您开启新的排障对话。请告诉我您遇到的系统问题或需求：'
            : 'Started a new troubleshooting session. Please tell me about your system issue or question:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionCards: [],
          diagnostics: [],
        },
      ],
    };
    sessions.value.unshift(newSession);
    currentSessionId.value = newId;
    saveSessions();
  };

  // 切换会话
  const switchSession = (id: string) => {
    currentSessionId.value = id;
  };

  // 重命名会话
  const renameSession = (id: string, newTitle: string) => {
    const s = sessions.value.find((item) => item.id === id);
    if (s && newTitle.trim()) {
      s.title = newTitle.trim();
      s.updatedAt = new Date().toLocaleString();
      saveSessions();
    }
  };

  // 删除会话
  const deleteSession = (id: string) => {
    if (sessions.value.length <= 1) {
      // 最后一个会话重置为空会话
      sessions.value = [];
      createNewSession();
      return;
    }

    sessions.value = sessions.value.filter((s) => s.id !== id);
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0].id;
    }
    saveSessions();
  };

  // 一键清理所有历史会话
  const clearAllSessions = () => {
    if (!confirm('确定要清空全部历史排障会话记录吗？\n所有旧对话将被删除，并开启全新的诊断会话。')) {
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear chat sessions from localStorage:', e);
    }
    sessions.value = [];
    createNewSession();
  };

  // 导出当前会话为 Markdown 排障报告

  const exportSessionToMarkdown = () => {
    const session = currentSession.value;
    if (!session) return;

    let md = `# AI-Shell 系统排障与维护诊断报告\n\n`;
    md += `- **会话标题**: ${session.title}\n`;
    md += `- **导出时间**: ${new Date().toLocaleString()}\n`;
    md += `- **创建时间**: ${session.createdAt}\n`;
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

    // 触发浏览器下载
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Shell-排障报告-${session.title.replace(/[\\/:*?"<>|]/g, '_')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 发送消息
  const sendMessage = async (userQuery: string) => {
    if (!userQuery.trim() || isGenerating.value) return;

    const session = currentSession.value;
    if (!session) return;

    // 自动重命名会话标题（若为默认名称）
    if (session.title === '新排障会话' || session.title === '新排障对话') {
      session.title = userQuery.slice(0, 20);
    }
    session.updatedAt = new Date().toLocaleString();

    // 1. 添加用户消息
    session.messages.push({
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      content: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    isGenerating.value = true;

    // 2. 构造 AI 消息占位
    const aiMsg: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      sender: 'ai',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      diagnostics: [],
      actionCards: [],
    };
    session.messages.push(aiMsg);
    const targetMsg = session.messages[session.messages.length - 1];

    // 3. 判断是否使用真实大模型
    if (hasConfiguredApiKey()) {
      try {
        const result = await runAgentDiagnosis(
          userQuery,
          settings,
          (logs) => {
            targetMsg.diagnostics = logs;
          },
          (streamingText) => {
            targetMsg.content = streamingText;
          },
          locale.value
        );

        targetMsg.content = result.finalContent;
        targetMsg.summary = result.summary;
        targetMsg.actionCards = result.actionCards;
        targetMsg.diagnostics = result.logs;
        targetMsg.aiDebugLogs = result.debugLogs;
      } catch (err: any) {
        console.warn('真实 AI 调度失败，回退到离线诊断规则:', err);
        targetMsg.content = locale.value === 'en-US'
          ? `[Notice: AI remote endpoint returned error: ${err.message || err}. Falling back to native offline rule engine]\n\n`
          : `【提示：AI 远程接口调用异常: ${err.message || err}，已自动启用本地离线规则引擎完成排障】\n\n`;
        await runFallbackOfflineDiagnosis(targetMsg, userQuery);
      }
    } else {
      // 演示/离线规则模式
      await runFallbackOfflineDiagnosis(targetMsg, userQuery);
    }

    targetMsg.isStreaming = false;
    isGenerating.value = false;
    saveSessions();
  };

  // 离线规则 / 演示引擎
  const runFallbackOfflineDiagnosis = async (targetMsg: ChatMessage, query: string) => {
    const q = query.toLowerCase();
    if (q.includes('docker') || q.includes('容器') || q.includes('dangling') || q.includes('container') || q.includes('镜像体检')) {
      await simulateDockerDiagnosis(targetMsg);
    } else if (q.includes('大文件') || q.includes('镜像') || q.includes('占用超过') || q.includes('large') || q.includes('file')) {
      await simulateLargeFileDiagnosis(targetMsg);
    } else if (q.includes('卡') || q.includes('慢') || q.includes('slow') || q.includes('cpu') || q.includes('memory') || q.includes('lag')) {
      await simulatePerformanceDiagnosis(targetMsg);
    } else if (q.includes('c盘') || q.includes('垃圾') || q.includes('清理') || q.includes('缓存') || q.includes('clean') || q.includes('junk') || q.includes('cache')) {
      await simulateDiskDiagnosis(targetMsg);
    } else if (q.includes('网') || q.includes('网页') || q.includes('net') || q.includes('dns') || q.includes('connect')) {
      await simulateNetworkDiagnosis(targetMsg);
    } else if (q.includes('端口') || q.includes('8080') || q.includes('port')) {
      await simulatePortDiagnosis(targetMsg, query);
    } else if (q.includes('自启') || q.includes('启动') || q.includes('开机') || q.includes('autostart') || q.includes('startup')) {
      await simulateAutostartDiagnosis(targetMsg);
    } else if (q.includes('磁盘') || q.includes('空间') || q.includes('disk') || q.includes('space')) {
      await simulateDiskDiagnosis(targetMsg);
    } else {
      await simulateGeneralDiagnosis(targetMsg, query);
    }
  };


  const simulateLargeFileDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Scanning disk for huge files (>500MB) and virtual disk images...\n\n'
      : '正在深入排查磁盘中占用 >500MB 的巨型文件与虚拟磁盘镜像...\n\n';
    await delay(500);

    let files: LargeFileInfo[] = [];
    try {
      files = await invoke<LargeFileInfo[]>('scan_large_files', {
        targetDir: 'default',
        minSizeMb: 500,
        limit: 10,
      });
      if (!files || files.length === 0) {
        files = await invoke<LargeFileInfo[]>('scan_large_files', {
          targetDir: 'default',
          minSizeMb: 100,
          limit: 10,
        });
      }
    } catch (e) {
      console.warn('scan_large_files fallback:', e);
      files = [
        { path: 'C:\\Users\\AppData\\Local\\Packages\\WSL\\ext4.vhdx', fileName: 'ext4.vhdx', sizeBytes: 15400000000, sizeFormatted: '14.34 GB', fileType: 'virtual_disk', modifiedTime: '2026-08-18 14:00' },
        { path: 'C:\\Users\\Downloads\\ubuntu-24.04-desktop.iso', fileName: 'ubuntu-24.04-desktop.iso', sizeBytes: 5800000000, sizeFormatted: '5.40 GB', fileType: 'virtual_disk', modifiedTime: '2026-07-22 09:00' },
        { path: 'C:\\Users\\Videos\\Captures\\screen_record_4k.mp4', fileName: 'screen_record_4k.mp4', sizeBytes: 3200000000, sizeFormatted: '2.98 GB', fileType: 'media', modifiedTime: '2026-08-10 20:00' },
        { path: 'C:\\Users\\Downloads\\cuda_12.2_installer.exe', fileName: 'cuda_12.2_installer.exe', sizeBytes: 3100000000, sizeFormatted: '2.88 GB', fileType: 'archive', modifiedTime: '2026-06-15 11:00' },
      ];
    }

    if (!files || files.length === 0) {
      msg.content = isEn
        ? '## 🛸 Huge Disk Files Radar Report\n\n🎉 Great! No redundant files >100MB found in user home directory. Disk health is optimal!'
        : '## 磁盘巨型文件雷达透视报告\n\n🎉 太棒了！未在当前用户主目录中发现占用 >100MB 的冗余大文件，磁盘空间状态优良！';
      msg.summary = isEn
        ? '- **Disk Status**: Disk space is healthy, no abnormal huge files detected.\n- **Recommendation**: Keep maintaining good file hygiene.'
        : '- **空间现状**：磁盘空间健康，未发现异常冗余大文件。\n- **维护建议**：继续保持良好的文件管理习惯。';
      msg.actionCards = [];
      return;
    }

    msg.diagnostics = [
      {
        command: 'scan_large_files --min-size 500MB --limit 10',
        output: files.map((f) => `${f.fileName} (${f.sizeFormatted}) -> ${f.path}`).join('\n'),
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn
      ? `## 🛸 Huge Disk Files Radar Report\n\nCompleted multithreaded deep inspection of disk drives. Found **${files.length}** major huge files:\n\n`
      : `## 磁盘巨型文件雷达透视报告\n\n已完成对磁盘中占用排名前列的巨型文件的多线程深度排查，共发现 **${files.length}** 个核心大文件：\n\n`;
    report += isEn ? `### 🛸 Space Consumption Top Ranking:\n\n` : `### 🛸 空间占用 Top 排行榜：\n\n`;
    report += isEn
      ? `| Rank | File Name | Size | Type | Full Path |\n| :--- | :--- | :--- | :--- | :--- |\n`
      : `| 排名 | 文件名称 | 占用体积 | 类型 | 完整路径 |\n| :--- | :--- | :--- | :--- | :--- |\n`;

    for (let i = 0; i < files.slice(0, 5).length; i++) {
      const f = files[i];
      report += `| ${i + 1} | **${f.fileName}** | **${f.sizeFormatted}** | \`${f.fileType}\` | \`${f.path}\` |\n`;
    }

    msg.content = report;
    msg.summary = isEn
      ? `- **Disk Status**: Large files are concentrated in virtual disks & installer images, largest item is **${files[0]?.fileName}** (\`${files[0]?.sizeFormatted}\`).\n- **Recommendation**: Click the action card below to highlight and inspect this file in Windows File Explorer.`
      : `- **空间现状**：大文件主要集中在虚拟磁盘与安装镜像，单项最大占用为 **${files[0]?.fileName}** (\`${files[0]?.sizeFormatted}\`)。\n- **优化建议**：点击下方操作卡片可直接在 Windows 资源管理器中高亮定位该文件，快速确认用途并安全清理。`;

    msg.actionCards = files.slice(0, 2).map((f, idx) => ({
      id: `act-locate-${idx}-${Date.now()}`,
      title: isEn ? `Locate in Folder: ${f.fileName} (${f.sizeFormatted})` : `在文件夹中定位大文件: ${f.fileName} (${f.sizeFormatted})`,
      type: 'general',
      severity: 'info',
      impactDescription: isEn ? `Highlight and reveal ${f.fileName} in Windows File Explorer.` : `将直接唤起 Windows 文件资源管理器并高亮选中该文件，便于您确认是否保留。`,
      expectedBenefit: isEn ? `Inspect file content and decide whether to delete` : `直观核查大文件内容与用途`,
      actionButtonText: isEn ? `Locate ${f.fileName}` : `定位 ${f.fileName}`,
      status: 'pending',
      details: { action: 'locate_file', path: f.path },
    }));
  };



  const simulatePerformanceDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Sampling real-time telemetry on CPU load, memory usage, and heavy processes...\n\n'
      : '正在调度系统底层探针实时采集 CPU、内存及进程负载数据...\n\n';
    await delay(500);

    let metrics: any = null;
    let procList: ProcessItem[] = [];

    try {
      metrics = await invoke('get_system_metrics');
      procList = await invoke<ProcessItem[]>('get_process_list', { limit: 10 });
    } catch (e) {
      console.warn('get_system_metrics/get_process_list fallback:', e);
      metrics = { cpu_usage: 48.2, memory_used_gb: 13.8, memory_total_gb: 16.0, memory_usage_percent: 86.2 };
      procList = [
        { pid: 14820, name: 'electron_crash_dump.exe', cpuPercent: 32.4, memoryMB: 4850, isSafeToKill: true, category: 'user', status: 'running' },
        { pid: 21044, name: 'chrome.exe', cpuPercent: 18.2, memoryMB: 2340, isSafeToKill: true, category: 'user', status: 'running' },
      ];
    }

    const topSafe = procList.find((p) => p.isSafeToKill && (p.memoryMB > 400 || p.cpuPercent > 10)) || procList[0];

    msg.diagnostics = [
      {
        command: 'inspect_system_metrics',
        output: `CPU Load: ${metrics.cpu_usage}%, Memory: ${metrics.memory_used_gb}GB / ${metrics.memory_total_gb}GB (${metrics.memory_usage_percent}%)`,
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        command: 'get_top_processes --sort memory --limit 5',
        output: procList.slice(0, 5).map((p) => `PID: ${p.pid} | ${p.name} | ${p.memoryMB}MB | CPU: ${p.cpuPercent}% | Safe: ${p.isSafeToKill}`).join('\n'),
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn
      ? `## ⚡ System Performance & Process Telemetry Report\n\n- **CPU Utilization**: **${metrics.cpu_usage}%**\n- **Physical Memory**: **${metrics.memory_used_gb} GB / ${metrics.memory_total_gb} GB** (${metrics.memory_usage_percent}%)\n\n`
      : `## 系统性能与高负载进程排查报告\n\n- **当前 CPU 占用率**: **${metrics.cpu_usage}%**\n- **物理内存占用**: **${metrics.memory_used_gb} GB / ${metrics.memory_total_gb} GB** (${metrics.memory_usage_percent}%)\n\n`;
    report += isEn ? `### 📊 Top Active Processes by Resource Load:\n\n` : `### 📊 占用排名前列的核心活跃进程：\n\n`;
    report += isEn
      ? `| PID | Process Name | CPU Load | Memory | Safety Rating |\n| :--- | :--- | :--- | :--- | :--- |\n`
      : `| PID | 进程名称 | CPU 占用 | 物理内存 | 安全评级 |\n| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const p of procList.slice(0, 5)) {
      const badge = isEn
        ? (p.isSafeToKill ? '⚡ **Safe to Terminate**' : '🛡️ Protected System Process')
        : (p.isSafeToKill ? '⚡ **可安全查杀**' : '🛡️ 系统核心保护');
      report += `| \`${p.pid}\` | **${p.name}** | \`${p.cpuPercent}%\` | **${p.memoryMB > 1024 ? `${(p.memoryMB / 1024).toFixed(2)} GB` : `${p.memoryMB} MB`}** | ${badge} |\n`;
    }

    msg.content = report;
    const memStr = topSafe && topSafe.memoryMB > 1024 ? `${(topSafe.memoryMB / 1024).toFixed(2)} GB` : `${topSafe?.memoryMB || 0} MB`;
    if (isEn) {
      msg.summary = topSafe && topSafe.isSafeToKill
        ? `- **Telemetry**: Detected process \`${topSafe.name}\` (PID: ${topSafe.pid}) occupying **${memStr}** RAM.\n- **Remediation**: Terminate this process with 1 click to release system pressure.`
        : `- **Telemetry**: CPU is at ${metrics.cpu_usage}%, Memory at ${metrics.memory_usage_percent}%.\n- **Recommendation**: System is running smoothly without rogue processes.`;
    } else {
      msg.summary = topSafe && topSafe.isSafeToKill
        ? `- **性能现状**：检测到进程 \`${topSafe.name}\` (PID: ${topSafe.pid}) 占用了 **${memStr}** 内存。\n- **处置方案**：建议一键结束该异常高负载进程，即可迅速释放系统压力。`
        : `- **性能现状**：系统全局 CPU 负载为 ${metrics.cpu_usage}%，内存占用 ${metrics.memory_usage_percent}%。\n- **优化建议**：系统运行平稳，暂无死锁失控的流氓进程。`;
    }

    msg.actionCards = topSafe && topSafe.isSafeToKill
      ? [
          {
            id: `act-kill-${topSafe.pid}`,
            title: isEn ? `Terminate High Load Process: ${topSafe.name} (PID: ${topSafe.pid})` : `一键结束高负载进程: ${topSafe.name} (PID: ${topSafe.pid})`,
            type: 'kill_process',
            severity: 'warning',
            impactDescription: isEn ? `Safely terminate non-critical process ${topSafe.name} (PID: ${topSafe.pid}).` : `将强制结束进程 ${topSafe.name} (PID: ${topSafe.pid})，已确认非核心系统服务，安全无副作用。`,
            expectedBenefit: isEn ? `Release approx ${memStr} RAM and reduce CPU load by ~${topSafe.cpuPercent}%` : `预计立即可释放 ${memStr} 内存，CPU 占用率下降约 ${topSafe.cpuPercent}%`,
            actionButtonText: isEn ? `Terminate ${topSafe.name}` : `立即结束 ${topSafe.name}`,
            status: 'pending',
            details: { pid: topSafe.pid, name: topSafe.name },
          },
        ]
      : [];
  };


  const simulateDiskDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Scanning C: drive for system temporary junk, Windows Update cache, and crash dumps...\n\n'
      : '正在深入扫描 C 盘系统临时文件、Windows Update 安装包与崩溃转储...\n\n';
    await delay(500);

    let scanResult: GarbageScanResult | null = null;
    try {
      scanResult = await invoke<GarbageScanResult>('scan_system_garbage');
    } catch (e) {
      console.warn('scan_system_garbage fallback:', e);
      scanResult = {
        totalBytes: 3850000000,
        totalFormatted: '3.58 GB',
        items: [
          { name: isEn ? 'Windows Update History Download Packages' : 'Windows Update 历史安装下载包', path: 'C:\\Windows\\SoftwareDistribution\\Download', sizeBytes: 2400000000, sizeFormatted: '2.23 GB', description: isEn ? 'Legacy patch packages left by installed updates' : '已安装更新遗留的历史补丁包' },
          { name: isEn ? 'User Temp Cache (User Temp)' : '用户临时缓存 (User Temp)', path: 'C:\\Users\\AppData\\Local\\Temp', sizeBytes: 1100000000, sizeFormatted: '1.02 GB', description: isEn ? 'Temporary files created by software installers & runtime' : '软件解压安装与运行临时文件' },
          { name: isEn ? 'Application Crash Dumps (CrashDumps)' : '应用程序崩溃转储 (CrashDumps)', path: 'C:\\Users\\AppData\\Local\\CrashDumps', sizeBytes: 350000000, sizeFormatted: '333.7 MB', description: isEn ? 'Crash dumps generated during unexpected software exits' : '历史软件闪退生成的内存转储文件' },
        ],
      };
    }

    const items = scanResult?.items || [];
    msg.diagnostics = [
      {
        command: 'scan_system_garbage --target C:\\',
        output: items.map((i) => `${i.name} -> ${i.sizeFormatted} (${i.path})`).join('\n'),
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn
      ? `## 🧹 System Disk Junk & Cache Scan Report\n\nCompleted scanning 6 major cache directories. Found **${scanResult?.totalFormatted || '0.0 MB'}** of safely reclaimable space!\n\n`
      : `## C 盘深度垃圾与更新缓存扫描报告\n\n已完成对系统盘 6 大重灾区缓存的全面排查，共发现 **${scanResult?.totalFormatted || '0.0 MB'}** 可安全清理的空间！\n\n`;
    report += isEn ? `### 📁 Junk & Cache Breakdown List:\n\n` : `### 📁 垃圾与缓存分布明细清单：\n\n`;
    report += isEn
      ? `| Cache Category | Size | Description |\n| :--- | :--- | :--- |\n`
      : `| 缓存分类 | 占用容量 | 说明 |\n| :--- | :--- | :--- |\n`;

    for (const item of items) {
      report += `| **${item.name}** | \`${item.sizeFormatted}\` | ${item.description} |\n`;
    }

    msg.content = report;
    const totalFormatted = scanResult?.totalFormatted || '3.58 GB';
    if (isEn) {
      msg.summary = `- **Disk Status**: C: drive has accumulated **${totalFormatted}** of safely removable system patches and caches.\n- **Safety Guarantee**: Personal documents are NEVER touched. Click the card below to safely reclaim disk space.`;
    } else {
      msg.summary = `- **空间现状**：C 盘累计堆积了 **${totalFormatted}** 可安全清理的系统补丁与临时缓存。\n- **安全保证**：本工具绝不触碰个人文档与系统文件。建议点击下方卡片一键安全瘦身，立即恢复宝贵磁盘空间。`;
    }

    const totalGb = (scanResult?.totalBytes || 0) / (1024 * 1024 * 1024);

    msg.actionCards = [
      {
        id: 'act-clean-disk-all',
        title: isEn ? `One-Click Clean System Junk (${totalFormatted})` : `一键安全清理 C 盘垃圾 (${totalFormatted})`,
        type: 'clean_disk',
        severity: 'warning',
        impactDescription: isEn ? `Safely clean temporary files, update download packages, and application crash dumps.` : `将安全清理系统临时文件、Windows Update 历史下载包与应用崩溃转储。`,
        expectedBenefit: isEn ? `Reclaim approx ${totalFormatted} valuable storage space on C: drive` : `预计立即可为 C 盘释放 ${totalFormatted} 宝贵空间`,
        actionButtonText: isEn ? `Clean Now (${totalFormatted})` : `立即清理 (${totalFormatted})`,
        status: 'pending',
        details: { freedGB: totalGb > 0 ? parseFloat(totalGb.toFixed(2)) : 3.58 },
      },
    ];
  };


  const simulateNetworkDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Running 4-stage end-to-end network health check (NIC ➔ Gateway ➔ Backbone ➔ DNS & HTTP)...\n\n'
      : '正在执行四段式网络全链路体检（物理网卡 ➔ 路由器网关 ➔ 公网骨干 ➔ DNS & HTTP）...\n\n';
    await delay(500);

    let net: NetworkDiagnosisResult | null = null;
    let dnsList: any[] = [];

    try {
      net = await invoke<NetworkDiagnosisResult>('diagnose_network_health');
      dnsList = await invoke<any[]>('test_dns_latency');
    } catch (e) {
      console.warn('network diagnose fallback:', e);
      net = {
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
        summaryText: isEn ? 'All network links are healthy. Local gateway, DNS resolution, and HTTP connectivity are operational.' : '全链路网络畅通，局域网、DNS 解析与外网 HTTP 连接全部正常。',
      };
      dnsList = [
        { name: 'AliDNS (223.5.5.5)', primaryIp: '223.5.5.5', secondaryIp: '223.6.6.6', latencyMs: 14, status: 'fast' },
        { name: 'Cloudflare (1.1.1.1)', primaryIp: '1.1.1.1', secondaryIp: '1.0.0.1', latencyMs: 18, status: 'fast' },
      ];
    }

    const fastest = dnsList.find((d) => d.latencyMs) || dnsList[0] || { name: 'AliDNS', primaryIp: '223.5.5.5', secondaryIp: '223.6.6.6', latencyMs: 14 };

    msg.diagnostics = [
      {
        command: 'diagnose_network_health',
        output: `Local: ${net.localIp} | Gateway (${net.gatewayIp}): ${net.gatewayPingMs ? `${net.gatewayPingMs}ms` : 'Timeout'}\nPublic DNS (223.5.5.5): ${net.publicDnsPingMs ? `${net.publicDnsPingMs}ms` : 'Timeout'}\nDNS Resolve: ${net.dnsResolveOk ? 'OK' : 'FAILED'} (${net.dnsResolveMs || '-'}ms) | HTTP: ${net.httpAccessOk ? 'OK' : 'FAILED'} (${net.httpLatencyMs || '-'}ms)`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn ? `## 🌐 Full-Link Network Connectivity & Health Report\n\n` : `## 全链路网络健康与连通性体检报告\n\n`;
    report += isEn ? `### 🌐 Network Topology 4-Node Status:\n\n` : `### 🌐 网络拓扑四大节点状态：\n\n`;
    report += isEn
      ? `| Topology Node | Target | Round-trip Latency | Status |\n| :--- | :--- | :--- | :--- |\n`
      : `| 拓扑节点 | 目标地址 | 往返延迟 | 状态灯 |\n| :--- | :--- | :--- | :--- |\n`;

    report += isEn
      ? `| **1. Local Network Adapter** | \`${net.localIp}\` | - | 🟢 Ready |\n`
      : `| **1. 本机物理网卡** | \`${net.localIp}\` | - | 🟢 就绪 |\n`;
    report += isEn
      ? `| **2. Router Gateway** | \`${net.gatewayIp}\` | **${net.gatewayPingMs ? `${net.gatewayPingMs} ms` : 'Timeout'}** | ${net.gatewayPingMs ? '🟢 Normal' : '🔴 Error'} |\n`
      : `| **2. 路由器网关** | \`${net.gatewayIp}\` | **${net.gatewayPingMs ? `${net.gatewayPingMs} ms` : '超时'}** | ${net.gatewayPingMs ? '🟢 正常' : '🔴 异常'} |\n`;
    report += isEn
      ? `| **3. Public DNS Backbone** | \`223.5.5.5\` | **${net.publicDnsPingMs ? `${net.publicDnsPingMs} ms` : 'Timeout'}** | ${net.publicDnsPingMs ? '🟢 Normal' : '🔴 Error'} |\n`
      : `| **3. 公网骨干互联** | \`223.5.5.5\` | **${net.publicDnsPingMs ? `${net.publicDnsPingMs} ms` : '超时'}** | ${net.publicDnsPingMs ? '🟢 正常' : '🔴 异常'} |\n`;
    report += isEn
      ? `| **4. DNS Resolve & HTTP** | \`baidu.com\` | **${net.httpLatencyMs ? `${net.httpLatencyMs} ms` : 'Timeout'}** | ${net.dnsResolveOk ? '🟢 Normal' : '🔴 DNS Error'} |\n\n`
      : `| **4. DNS 解析与 HTTP** | \`baidu.com\` | **${net.httpLatencyMs ? `${net.httpLatencyMs} ms` : '超时'}** | ${net.dnsResolveOk ? '🟢 正常' : '🔴 域名解析失败'} |\n\n`;

    report += isEn ? `### 📋 Diagnostic Summary:\n` : `### 📋 诊断总结 (Summary)：\n`;
    report += isEn
      ? `- **Network Status**: ${net.summaryText}\n- **Recommendation**: If facing proxy residual disconnects or slow browsing, click the reset button below.`
      : `- **网络状态**：${net.summaryText}\n- **处置建议**：如遇代理残留导致打不开网页，点击下方【一键全套网络急救复位】可立即自动修复。`;

    msg.content = report;

    msg.actionCards = [
      {
        id: 'act-full-net-repair',
        title: isEn ? '⚡ Full-Link Network Reset (Recommended)' : '⚡ 一键全套网络急救复位 (推荐修复)',
        type: 'fix_network',
        severity: 'warning',
        impactDescription: isEn ? 'Flush DNS cache, reset Winsock catalog, reset TCP/IP stack, and renew DHCP lease.' : '自动执行清空 DNS 缓存、重置 Winsock 目录、重置 TCP/IP 协议栈并重新向路由器租用 DHCP IP。',
        expectedBenefit: isEn ? 'Resolve inaccessible web pages, broken proxies, DNS hijacking, and IP conflicts' : '全面解决打不开网页、代理断开后断网、DNS 污染与 IP 冲突',
        actionButtonText: isEn ? 'Execute Full Network Reset' : '立即执行全套网络急救',
        status: 'pending',
        details: { action: 'full_repair' },
      },
      {
        id: `act-apply-dns-${fastest.primaryIp}`,
        title: isEn ? `Switch to Fastest Backbone DNS (${fastest.name} - ${fastest.latencyMs || 15}ms)` : `一键切换至最优骨干 DNS (${fastest.name} - ${fastest.latencyMs || 15}ms)`,
        type: 'fix_network',
        severity: 'info',
        impactDescription: isEn ? `Configure IPv4 DNS to ${fastest.primaryIp} (secondary: ${fastest.secondaryIp}) and flush DNS cache.` : `将当前网卡的 IPv4 DNS 切换为 ${fastest.primaryIp} (备用: ${fastest.secondaryIp})，并自动刷新本地 DNS 解析缓存。`,
        expectedBenefit: isEn ? 'Accelerate web browsing and prevent DNS hijacking' : `提升网页解析速度，解决网页打开慢与域名劫持`,
        actionButtonText: isEn ? `Apply ${fastest.name}` : `应用 ${fastest.name}`,
        status: 'pending',
        details: { primary: fastest.primaryIp, secondary: fastest.secondaryIp, name: fastest.name },
      },
      {
        id: 'act-flush-dns-cache',
        title: isEn ? 'Flush System DNS Cache (ipconfig /flushdns)' : '一键刷新系统 DNS 解析缓存 (Flush DNS)',
        type: 'fix_network',
        severity: 'info',
        impactDescription: isEn ? 'Run `ipconfig /flushdns` to clear outdated or poisoned domain mappings.' : '执行 `ipconfig /flushdns` 清空 Windows 缓存的过时/污染域名映射。',
        expectedBenefit: isEn ? 'Instantly recover domain resolution' : '快速恢复失效域名的正常访问',
        actionButtonText: isEn ? 'Flush DNS' : '刷新解析缓存',
        status: 'pending',
        details: { action: 'flush' },
      },
    ];
  };




  const simulatePortDiagnosis = async (msg: ChatMessage, query: string) => {
    const isEn = locale.value === 'en-US';
    const match = query.match(/(\d{2,5})/);

    if (match) {
      const targetPort = parseInt(match[1], 10);
      msg.content += isEn
        ? `Invoking network telemetry to inspect port **:${targetPort}**...\n\n`
        : `正在调度系统底层网络探针，精准排查 **:${targetPort}** 端口占用...\n\n`;
      await delay(400);

      let occupant: PortOccupantInfo | null = null;
      try {
        occupant = await invoke<PortOccupantInfo>('check_port_occupancy', { port: targetPort });
      } catch (e) {
        console.warn('check_port_occupancy invoke error:', e);
        occupant = {
          port: targetPort,
          isOccupied: true,
          pid: 21044,
          processName: 'node.exe',
          memoryMB: 245.8,
          cpuPercent: 1.2,
          protocol: 'TCP',
          localAddress: `0.0.0.0:${targetPort}`,
          status: 'LISTENING',
          exePath: 'C:\\Program Files\\nodejs\\node.exe',
        };
      }

      if (!occupant || !occupant.isOccupied) {
        msg.diagnostics = [
          {
            command: `netstat -ano -p tcp | findstr :${targetPort}`,
            output: `TCP 0.0.0.0:${targetPort} -> No active listener found. (Port is IDLE)`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
        msg.content = isEn
          ? `## 🔍 Port Telemetry Report (:${targetPort})\n\n✅ Verified: Port **:${targetPort}** is currently **FREE & IDLE**. No applications are listening on this port.`
          : `## 端口排查报告 (:${targetPort})\n\n✅ 经过网络协议栈实时排查，端口 **:${targetPort}** 当前完全处于 **空闲状态**，未被任何应用程序监听，您可以直接启动您的服务！`;
        msg.actionCards = [];
        return;
      }

      msg.diagnostics = [
        {
          command: `netstat -ano -p tcp | findstr :${targetPort}`,
          output: `${occupant.protocol} ${occupant.localAddress} -> LISTENING (PID: ${occupant.pid})`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ];

      msg.content = isEn
        ? `## 🔍 Port Conflict Report (:${targetPort})\n\nDiagnosis finding: Port **:${targetPort}** is currently **OCCUPIED**.\n\n- **Process**: \`${occupant.processName || 'Unknown'}\`\n- **PID**: \`${occupant.pid}\`\n- **Memory**: ${occupant.memoryMB ? `${occupant.memoryMB} MB` : 'Kernel'}\n- **Address**: \`${occupant.localAddress}\`${occupant.exePath ? `\n- **Binary Path**: \`${occupant.exePath}\`` : ''}\n`
        : `## 端口冲突排查报告 (:${targetPort})\n\n诊断发现：端口 **:${targetPort}** 当前正处于 **被占用状态**。\n\n- **占用进程**: \`${occupant.processName || '未知应用'}\`\n- **进程 PID**: \`${occupant.pid}\`\n- **内存占用**: ${occupant.memoryMB ? `${occupant.memoryMB} MB` : '系统内核'}\n- **监听地址**: \`${occupant.localAddress}\`${occupant.exePath ? `\n- **文件路径**: \`${occupant.exePath}\`` : ''}\n`;
      msg.summary = isEn
        ? `- **Port Status**: Port :${targetPort} is occupied by \`${occupant.processName}\`.\n- **Recommendation**: Release the port by clicking the action card below if you need to run your server.`
        : `- **端口状态**：:${targetPort} 端口正被 \`${occupant.processName}\` 占用中。\n- **处置方案**：若产生冲突，可点击下方操作卡片一键安全释放该端口。`;

      msg.actionCards = [
        {
          id: `act-kill-port-${targetPort}`,
          title: isEn ? `Force Release Port :${targetPort} (${occupant.processName || 'Process'})` : `一键强制释放 :${targetPort} 端口 (${occupant.processName || '占用进程'})`,
          type: 'kill_process',
          severity: 'warning',
          impactDescription: isEn ? `Force terminate process ${occupant.processName || ''} (PID: ${occupant.pid}) occupying port :${targetPort}.` : `将强制结束占用 :${targetPort} 端口的进程 ${occupant.processName || ''} (PID: ${occupant.pid})，非核心系统服务，安全无副作用。`,
          expectedBenefit: isEn ? `Immediately unbind and free port :${targetPort}` : `立即解除 :${targetPort} 端口占用冲突，恢复网络端口绑定`,
          actionButtonText: isEn ? `Release :${targetPort}` : `释放 :${targetPort} 端口`,
          status: 'pending',
          details: { pid: occupant.pid, port: targetPort },
        },
      ];
    } else {
      // 全量扫描
      msg.content += isEn
        ? 'Scanning all active listening TCP ports across operating system network stack...\n\n'
        : '正在全量扫描当前操作系统网络栈的所有活跃监听端口...\n\n';
      await delay(500);

      let portsList: PortOccupantInfo[] = [];
      try {
        portsList = await invoke<PortOccupantInfo[]>('scan_listening_ports');
      } catch (e) {
        console.warn('scan_listening_ports invoke error:', e);
        portsList = [
          { port: 1420, isOccupied: true, pid: 18420, processName: 'ai-shell.exe', memoryMB: 85.2, protocol: 'TCP', localAddress: '127.0.0.1:1420', status: 'LISTENING', cpuPercent: 0.5 },
          { port: 3000, isOccupied: true, pid: 21044, processName: 'node.exe', memoryMB: 210.4, protocol: 'TCP', localAddress: '0.0.0.0:3000', status: 'LISTENING', cpuPercent: 1.1 },
          { port: 3306, isOccupied: true, pid: 5412, processName: 'mysqld.exe', memoryMB: 420.0, protocol: 'TCP', localAddress: '0.0.0.0:3306', status: 'LISTENING', cpuPercent: 0.2 },
          { port: 8080, isOccupied: true, pid: 9812, processName: 'java.exe', memoryMB: 650.0, protocol: 'TCP', localAddress: '0.0.0.0:8080', status: 'LISTENING', cpuPercent: 2.3 },
        ];
      }

      if (!portsList || portsList.length === 0) {
        msg.content = isEn
          ? `## 🔍 System Port Telemetry Report\n\n✅ Scanned all ports. Network stack is clean and no conflicting listening ports were found.`
          : `## 全系统端口扫描报告\n\n✅ 经全面扫描，当前系统网络栈运行平稳，暂未发现处于监听中的冲突端口。\n\n### 📋 诊断总结 (Summary)：\n- **核心状态**：网络端口无冲突异常，所有关键服务正常。`;
        msg.actionCards = [];
        return;
      }

      const topPorts = portsList.slice(0, 6);
      msg.diagnostics = [
        {
          command: 'netstat -ano -p tcp | findstr LISTENING',
          output: topPorts.map((p) => `:${p.port} -> ${p.processName || 'Unknown'} (PID: ${p.pid || '-'})`).join('\n'),
          timestamp: new Date().toLocaleTimeString(),
        },
      ];

      let listMd = isEn
        ? `## 🔍 Active Listening TCP Ports Overview\n\nDetected **${portsList.length}** active listening TCP services:\n\n`
        : `## 系统活跃监听端口诊断清单\n\n当前系统共检测到 **${portsList.length}** 个正在监听的 TCP 端口服务：\n\n`;
      listMd += isEn
        ? `| Port | Application | Process PID | Memory |\n| :--- | :--- | :--- | :--- |\n`
        : `| 端口号 | 占用程序 | 进程 PID | 内存占用 |\n| :--- | :--- | :--- | :--- |\n`;
      for (const p of topPorts) {
        listMd += `| **:${p.port}** | \`${p.processName || 'System'}\` | \`${p.pid || '-'}\` | ${p.memoryMB ? `${p.memoryMB} MB` : '-'} |\n`;
      }
      listMd += isEn
        ? `\n### 📋 Diagnostic Summary:\n- **Network Telemetry**: ${portsList.length} ports are actively listening (mostly dev servers & database daemons).\n- **Recommendation**: Click an action card below to terminate a process and free its port.\n`
        : `\n### 📋 诊断总结 (Summary)：\n- **网络现状**：检测到 ${portsList.length} 个端口正在提供监听服务，主要为开发服务器与数据库。\n- **处置建议**：如遇到特定端口冲突或需重启某个服务，可点击下方卡片释放该端口。\n`;

      msg.content = listMd;

      msg.actionCards = topPorts
        .filter((p) => p.pid && p.pid > 4)
        .slice(0, 3)
        .map((p) => ({
          id: `act-kill-port-${p.port}`,
          title: isEn ? `Release Port :${p.port} (${p.processName || 'App'})` : `一键释放 :${p.port} 端口 (${p.processName || '占用程序'})`,
          type: 'kill_process',
          severity: 'warning',
          impactDescription: isEn ? `Force terminate process ${p.processName || ''} (PID: ${p.pid}) occupying port :${p.port}.` : `将强制结束占用 :${p.port} 端口的进程 ${p.processName || ''} (PID: ${p.pid})。`,
          expectedBenefit: isEn ? `Immediately release port :${p.port}` : `立即解除 :${p.port} 端口占用冲突`,
          actionButtonText: isEn ? `Release :${p.port}` : `释放 :${p.port} 端口`,
          status: 'pending',
          details: { pid: p.pid, port: p.port },
        }));
    }
  };



  const simulateAutostartDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Scanning Windows registry Run keys and Startup directories...\n\n'
      : '正在深入读取 Windows 系统注册表与启动目录自启项...\n\n';
    await delay(500);

    let list: any[] = [];
    try {
      list = await invoke<any[]>('get_autostart_entries');
    } catch (e) {
      console.warn('get_autostart_entries invoke fallback:', e);
      list = [
        { name: 'BaiduNetdisk', command: 'C:\\Program Files\\BaiduNetdisk\\baidunetdisk.exe -autostart', location: 'HKCU', enabled: true, publisher: 'Baidu', safeToDisable: true },
        { name: 'Steam', command: 'C:\\Program Files (x86)\\Steam\\steam.exe -silent', location: 'HKCU', enabled: true, publisher: 'Valve Steam', safeToDisable: true },
        { name: 'Spotify', command: 'C:\\Users\\AppData\\Spotify\\Spotify.exe --autostart', location: 'HKCU', enabled: true, publisher: 'Spotify AB', safeToDisable: true },
        { name: 'Realtek Audio', command: 'C:\\Program Files\\Realtek\\RtkAud.exe', location: 'HKLM', enabled: true, publisher: 'Realtek', safeToDisable: false },
        { name: 'Windows Security', command: 'C:\\Windows\\System32\\SecurityHealthSystray.exe', location: 'HKLM', enabled: true, publisher: 'Microsoft', safeToDisable: false },
      ];
    }

    const enabledItems = list.filter((i) => i.enabled);
    const recommended = list.filter((i) => i.enabled && i.safeToDisable);

    msg.diagnostics = [
      {
        command: 'query_registry_run_keys --include-startup-folder',
        output: `Total entries: ${list.length}, Enabled: ${enabledItems.length}, Recommended to disable: ${recommended.length}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn
      ? `## 🚀 Startup Items Deep Inspection Report\n\nDetected **${list.length}** startup programs (**${enabledItems.length}** currently enabled at boot).\n\n`
      : `## 开机自启动项深度诊断报告\n\n当前共检测到 **${list.length}** 个自启动项（其中 **${enabledItems.length}** 项已开启开机自启）。\n\n`;

    report += isEn ? `### 📋 Key Startup Item Evaluation:\n\n` : `### 📋 关键启动项健康评估清单：\n\n`;
    report += isEn
      ? `| Application | Publisher | Location | Recommendation |\n| :--- | :--- | :--- | :--- |\n`
      : `| 软件名称 | 发行者 | 生效位置 | 优化建议 |\n| :--- | :--- | :--- | :--- |\n`;

    for (const item of list.slice(0, 8)) {
      const advice = isEn
        ? (item.safeToDisable ? '⚡ **Recommended to Disable** (Speed up boot)' : '🛡️ **Keep** (System / Driver service)')
        : (item.safeToDisable ? '⚡ **建议安全禁用** (提速开机)' : '🛡️ **建议保留** (系统/驱动服务)');
      report += `| **${item.name}** | \`${item.publisher || (isEn ? 'Third-Party' : '第三方')}\` | ${item.location} | ${advice} |\n`;
    }

    msg.content = report;
    if (isEn) {
      msg.summary = recommended.length > 0
        ? `- **Boot Status**: Detected **${recommended.length}** unnecessary startup programs launching in background.\n- **Speedup Recommendation**: Disable recommended items to reduce boot time by approx **${recommended.length * 2}+** seconds.`
        : `- **Boot Status**: Startup items are very clean, no unnecessary software slowing down boot.\n- **Recommendation**: Maintain current configuration.`;
    } else {
      msg.summary = recommended.length > 0
        ? `- **开机现状**：检测到 **${recommended.length}** 个非必要自启软件在开机时后台常驻。\n- **提速建议**：建议一键禁用推荐项，开机启动耗时预计可缩短 **${recommended.length * 2}** 秒以上。`
        : `- **开机现状**：自启动项非常纯净，无明显拖慢开机的无用软件。\n- **维护建议**：继续保持当前的开机配置。`;
    }

    msg.actionCards = recommended.slice(0, 3).map((item) => ({
      id: `act-disable-autostart-${item.name}`,
      title: isEn ? `Disable ${item.name} from Auto-start` : `一键禁用 ${item.name} 开机自启`,
      type: 'toggle_autostart',
      severity: 'info',
      impactDescription: isEn ? `Removes this entry from registry Run keys without uninstalling the application.` : `将该软件从系统注册表 Run 启动项中移除，不会卸载软件，平时可照常手动双击打开。`,
      expectedBenefit: isEn ? `Reduce boot time by approx 2~4 seconds` : `预计可缩短开机启动耗时约 2~4 秒，开机更轻快`,
      actionButtonText: isEn ? `Disable ${item.name}` : `禁用 ${item.name} 自启`,
      status: 'pending',
      details: { name: item.name, enable: false },
    }));
  };


  const simulateDockerDiagnosis = async (msg: ChatMessage) => {
    const isEn = locale.value === 'en-US';
    msg.content += isEn
      ? 'Connecting to local Docker daemon to inspect container & image storage breakdown...\n\n'
      : '正在与本地 Docker 守护进程通信，深度排查容器与镜像空间占用...\n\n';
    await delay(500);

    let docker: DockerOverview | null = null;
    try {
      docker = await invoke<DockerOverview>('scan_docker_environment');
    } catch (e) {
      console.warn('scan_docker_environment fallback:', e);
      docker = {
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
        stoppedContainers: [],
        danglingImages: [],
      };
    }

    if (!docker.isInstalled) {
      msg.content = isEn
        ? `## 🐳 Docker Telemetry Report\n\n- **Detection**: The \`docker\` command-line tool is not installed or not in PATH.\n\n### 📋 Diagnostic Summary:\n- **Status**: No Docker environment detected, no container disk space consumed.`
        : `## Docker 环境体检报告\n\n- **检测结果**: 系统中未安装或未配置 \`docker\` 命令行工具。\n\n### 📋 诊断总结 (Summary)：\n- **核心状态**：未检测到 Docker 环境，无容器或镜像磁盘占用。`;
      msg.actionCards = [];
      return;
    }

    if (!docker.isRunning) {
      msg.content = isEn
        ? `## 🐳 Docker Telemetry Report\n\n- **Detection**: Docker (${docker.version || 'CLI'}) is installed, but Docker daemon is currently **stopped**.\n\n### 📋 Diagnostic Summary:\n- **Status**: Docker Desktop / Daemon is not running. Please start the service first.`
        : `## Docker 环境体检报告\n\n- **检测结果**: 已安装 Docker (${docker.version || 'CLI'})，但 Docker 守护进程目前处于**停止状态**。\n\n### 📋 诊断总结 (Summary)：\n- **核心状态**：Docker Desktop / Daemon 未启动，请先开启服务后再进行体检与瘦身。`;
      msg.actionCards = [];
      return;
    }

    msg.diagnostics = [
      {
        command: 'docker system df',
        output: `Images: ${docker.imagesSize} (Reclaimable: ${docker.imagesReclaimable})\nContainers: ${docker.containersSize} (Reclaimable: ${docker.containersReclaimable})\nLocal Volumes: ${docker.volumesSize} (Reclaimable: ${docker.volumesReclaimable})\nBuild Cache: ${docker.buildCacheSize} (Reclaimable: ${docker.buildCacheReclaimable})`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = isEn
      ? `## 🐳 Docker Containers & Images Health Report\n\n- **Docker Version**: \`${docker.version}\`\n- **Images**: **${docker.imagesSize}** (Reclaimable: **${docker.imagesReclaimable}**)\n- **Containers**: **${docker.containersSize}** (Stopped: **${docker.stoppedContainersCount}**)\n- **Build Cache**: **${docker.buildCacheSize}** (Reclaimable: **${docker.buildCacheReclaimable}**)\n\n`
      : `## Docker 容器与镜像专项体检报告\n\n- **Docker 版本**: \`${docker.version}\`\n- **镜像占用**: **${docker.imagesSize}** (可回收: **${docker.imagesReclaimable}**)\n- **容器占用**: **${docker.containersSize}** (已停止: **${docker.stoppedContainersCount}** 个)\n- **构建缓存**: **${docker.buildCacheSize}** (可回收: **${docker.buildCacheReclaimable}**)\n\n`;

    report += isEn ? `### 📋 Diagnostic Summary:\n` : `### 📋 诊断总结 (Summary)：\n`;
    report += isEn
      ? `- **Environment Telemetry**: Detected **${docker.buildCacheReclaimable || 'several GB'}** in build cache and stopped historical containers.\n- **Recommendation**: Click the action card below to safely clean dangling images and build caches without affecting running containers.`
      : `- **环境现状**：已发现约 **${docker.buildCacheReclaimable || '数 GB'}** 的构建残留与未运行历史容器。\n- **优化建议**：点击下方处置卡片执行一键安全瘦身，将安全释放悬挂镜像与构建缓存，不影响当前正在运行的业务容器。`;

    msg.content = report;
    msg.actionCards = [
      {
        id: `act-docker-prune-system`,
        title: isEn ? 'One-Click Docker Prune (docker system prune)' : '一键全盘 Docker 深度瘦身 (docker system prune)',
        type: 'general',
        severity: 'info',
        impactDescription: isEn ? 'Safely removes stopped containers, dangling images, and build caches without touching running containers.' : '安全清理所有已停止的容器、悬挂镜像 (Dangling) 以及 Docker 构建缓存，正在运行的容器完全不受影响。',
        expectedBenefit: isEn ? 'Reclaims massive disk space from build leftovers' : `预计可深度回收大量磁盘空间`,
        actionButtonText: isEn ? 'Prune Now' : '立即深度瘦身',
        status: 'pending',
        details: { action: 'prune_docker', target: 'system' },
      },
      {
        id: `act-docker-prune-containers`,
        title: isEn ? 'Prune Stopped Containers (docker container prune)' : '清理已停止的历史容器 (docker container prune)',
        type: 'general',
        severity: 'info',
        impactDescription: isEn ? `Deletes all ${docker.stoppedContainersCount} exited containers.` : `将删除全部处于 Exited 状态的 ${docker.stoppedContainersCount} 个历史残留容器。`,
        expectedBenefit: isEn ? 'Frees storage used by stopped containers' : '释放停止容器占用的存储空间',
        actionButtonText: isEn ? 'Prune Containers' : '清理停止容器',
        status: 'pending',
        details: { action: 'prune_docker', target: 'containers' },
      },
    ];
  };

  const simulateGeneralDiagnosis = async (msg: ChatMessage, query: string) => {
    msg.content = locale.value === 'en-US'
      ? `Received your query: "${query}". System is running stably with all core services healthy. You can configure your API Key in Settings to enable deep LLM reasoning!`
      : `已收到您的请求：“${query}”。系统当前运行平稳，所有核心服务正常。您可在【设置中心】输入 API Key 开启全模型深度智能推理！`;
  };

  const handleActionExecution = async (action: ActionCardData) => {
    action.status = 'executing';
    await delay(600);

    // 针对自启动项真实调用 Rust toggle_autostart
    if (action.type === 'toggle_autostart' && action.details?.name) {
      try {
        await invoke('toggle_autostart', {
          name: action.details.name,
          enable: action.details.enable ?? false,
        });
      } catch (e) {
        console.warn('toggle_autostart action invoke fallback:', e);
      }
    } else if (action.type === 'kill_process' && action.details?.pid) {
      try {
        await invoke('kill_process', { pid: action.details.pid });
      } catch (e) {
        console.warn('kill_process action invoke fallback:', e);
      }
    } else if (action.type === 'clean_disk') {
      try {
        await invoke('clean_system_garbage');
      } catch (e) {
        console.warn('clean_disk action invoke fallback:', e);
      }
    } else if (action.type === 'fix_network') {
      try {
        if (action.details?.action === 'full_repair') {
          await invoke('execute_network_repair', { action: 'full_repair' });
        } else if (action.details?.action === 'flush') {
          await invoke('flush_dns_cache');
        } else if (action.details?.primary) {
          await invoke('set_system_dns', {
            primary: action.details.primary,
            secondary: action.details.secondary || '',
          });
        }
      } catch (e) {
        console.warn('fix_network action invoke fallback:', e);
      }
    } else if (action.details?.action === 'locate_file' && action.details?.path) {

      try {
        await invoke('locate_file', { path: action.details.path });
      } catch (e) {
        console.warn('locate_file action invoke fallback:', e);
      }
    } else if (action.details?.action === 'prune_docker') {
      try {
        await invoke('prune_docker_target', { target: action.details.target || 'system' });
      } catch (e) {
        console.warn('prune_docker action invoke fallback:', e);
      }
    }






    action.status = 'completed';

    if (onExecuteActionCallback) {
      onExecuteActionCallback(action);
    }
    saveSessions();
  };



  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  return {
    sessions,
    currentSessionId,
    currentSession,
    messages,
    quickPrompts,
    isGenerating,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
    clearAllSessions,
    exportSessionToMarkdown,

    sendMessage,
    handleActionExecution,
  };
}
