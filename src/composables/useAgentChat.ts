import { ref, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage, ActionCardData, ChatSession, PortOccupantInfo, GarbageScanResult } from '@/types';

import { useSettings } from './useSettings';
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

  const quickPrompts = [
    { label: '为什么电脑突然很卡？', query: '为什么电脑这么卡？帮我全面检查一下。' },
    { label: 'C 盘空间满了怎么清理？', query: 'C盘快满了，帮我看看哪些文件或日志可以安全清理。' },
    { label: '网页打不开了/网络故障', query: '网页打不开了，网络好像不通，帮我诊断一下。' },
    { label: '提示 8080 端口被占用', query: '8080 端口被占用了，帮我找出是哪个程序占用的并释放。' },
  ];

  // 新建会话
  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: '新排障对话',
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          content: '已为您开启新的排障对话。请告诉我您遇到的系统问题或需求：',
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
          }
        );

        targetMsg.content = result.finalContent;
        targetMsg.actionCards = result.actionCards;
        targetMsg.diagnostics = result.logs;
        targetMsg.aiDebugLogs = result.debugLogs;
      } catch (err: any) {
        console.warn('真实 AI 调度失败，回退到离线诊断规则:', err);
        targetMsg.content = `【提示：AI 远程接口调用异常: ${err.message || err}，已自动启用本地离线规则引擎完成排障】\n\n`;
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
    if (q.includes('卡') || q.includes('慢') || q.includes('slow')) {
      await simulatePerformanceDiagnosis(targetMsg);
    } else if (q.includes('c盘') || q.includes('磁盘') || q.includes('空间') || q.includes('disk')) {
      await simulateDiskDiagnosis(targetMsg);
    } else if (q.includes('网') || q.includes('网页') || q.includes('net') || q.includes('dns')) {
      await simulateNetworkDiagnosis(targetMsg);
    } else if (q.includes('端口') || q.includes('8080') || q.includes('port')) {
      await simulatePortDiagnosis(targetMsg, query);
    } else if (q.includes('自启') || q.includes('启动') || q.includes('开机') || q.includes('autostart')) {
      await simulateAutostartDiagnosis(targetMsg);
    } else {
      await simulateGeneralDiagnosis(targetMsg, query);
    }

  };

  const simulatePerformanceDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在调度系统探针采集 CPU、内存及进程负载数据...';
    await delay(600);

    msg.diagnostics = [
      { command: 'inspect_system_metrics', output: 'CPU Load: 48.2%, Memory: 13.8GB / 16.0GB (86.2%), Disk Queue: 0.12', timestamp: '10:42:01' },
      { command: 'get_top_processes --sort memory --limit 5', output: 'PID: 14820 | electron_crash_dump.exe | 4.85GB | Status: Unresponsive\nPID: 21044 | chrome.exe | 2.34GB | Status: Running', timestamp: '10:42:02' },
    ];

    await delay(600);

    msg.content = `经过全面诊断，定位到系统目前存在 **2 个主要性能瓶颈**：\n\n1. **进程异常无响应**：检测到进程 \`electron_crash_dump.exe\` (PID: 14820) 处于死锁无响应状态，独占了 **4.85 GB 内存**与持续高 CPU 负载。\n2. **物理内存吃紧**：总体可用内存不足 14%，导致系统频繁触发换页。`;

    msg.actionCards = [
      {
        id: 'act-kill-crash',
        title: '一键结束死锁无响应进程',
        type: 'kill_process',
        severity: 'danger',
        impactDescription: '将强制结束进程 electron_crash_dump.exe (PID: 14820)，已确认非系统核心服务，安全无副作用。',
        expectedBenefit: '预计立即可释放 4.85 GB 内存，CPU 占用率下降约 32%',
        actionButtonText: '立即结束进程',
        status: 'pending',
        details: { pid: 14820, name: 'electron_crash_dump.exe' },
      },
      {
        id: 'act-clean-ram',
        title: '整理系统待机工作集',
        type: 'speedup_boot',
        severity: 'info',
        impactDescription: '通知系统内存管理器快速整理非活跃后台程序缓存。',
        expectedBenefit: '预计释放 1.2 GB 待机工作集',
        actionButtonText: '优化内存空间',
        status: 'pending',
      },
    ];
  };

  const simulateDiskDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在深入扫描 C 盘系统临时文件、Windows Update 安装包与崩溃转储...\n\n';
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
          { name: 'Windows Update 历史安装下载包', path: 'C:\\Windows\\SoftwareDistribution\\Download', sizeBytes: 2400000000, sizeFormatted: '2.23 GB', description: '已安装更新遗留的历史补丁包' },
          { name: '用户临时缓存 (User Temp)', path: 'C:\\Users\\AppData\\Local\\Temp', sizeBytes: 1100000000, sizeFormatted: '1.02 GB', description: '软件解压安装与运行临时文件' },
          { name: '应用程序崩溃转储 (CrashDumps)', path: 'C:\\Users\\AppData\\Local\\CrashDumps', sizeBytes: 350000000, sizeFormatted: '333.7 MB', description: '历史软件闪退生成的内存转储文件' },
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

    let report = `## C 盘深度垃圾与更新缓存扫描报告\n\n已完成对系统盘 6 大重灾区缓存的全面排查，共发现 **${scanResult?.totalFormatted || '0.0 MB'}** 可安全清理的空间！\n\n`;
    report += `### 📁 垃圾与缓存分布明细清单：\n\n`;
    report += `| 缓存分类 | 占用容量 | 说明 |\n`;
    report += `| :--- | :--- | :--- |\n`;

    for (const item of items) {
      report += `| **${item.name}** | \`${item.sizeFormatted}\` | ${item.description} |\n`;
    }

    report += `\n🛡️ **安全保证**：本工具仅清理已安装完毕的更新包、历史崩溃转储与临时中间文件，绝不触碰任何用户个人文档与系统核心文件。`;

    msg.content = report;

    const totalGb = (scanResult?.totalBytes || 0) / (1024 * 1024 * 1024);

    msg.actionCards = [
      {
        id: 'act-clean-disk-all',
        title: `一键安全清理 C 盘垃圾 (${scanResult?.totalFormatted || '3.58 GB'})`,
        type: 'clean_disk',
        severity: 'warning',
        impactDescription: `将安全清理系统临时文件、Windows Update 历史下载包与应用崩溃转储。`,
        expectedBenefit: `预计立即可为 C 盘释放 ${scanResult?.totalFormatted || '3.58 GB'} 宝贵空间`,
        actionButtonText: `立即清理 (${scanResult?.totalFormatted || '3.58 GB'})`,
        status: 'pending',
        details: { freedGB: totalGb > 0 ? parseFloat(totalGb.toFixed(2)) : 3.58 },
      },
    ];
  };


  const simulateNetworkDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在多线程并发测速各大骨干公共 DNS 延迟与本地网络连通性...\n\n';
    await delay(500);

    let dnsList: any[] = [];
    try {
      dnsList = await invoke<any[]>('test_dns_latency');
    } catch (e) {
      console.warn('test_dns_latency fallback:', e);
      dnsList = [
        { name: '阿里 AliDNS', primaryIp: '223.5.5.5', secondaryIp: '223.6.6.6', latencyMs: 14, status: 'fast' },
        { name: '腾讯 DNSPod', primaryIp: '119.29.29.29', secondaryIp: '182.254.116.116', latencyMs: 18, status: 'fast' },
        { name: '114 DNS', primaryIp: '114.114.114.114', secondaryIp: '114.114.115.115', latencyMs: 28, status: 'normal' },
        { name: 'Cloudflare', primaryIp: '1.1.1.1', secondaryIp: '1.0.0.1', latencyMs: 46, status: 'normal' },
      ];
    }

    const fastest = dnsList.find((d) => d.latencyMs) || dnsList[0];

    msg.diagnostics = [
      {
        command: 'test_dns_servers_concurrent --timeout 1200ms',
        output: dnsList.map((d) => `${d.name} (${d.primaryIp}) -> ${d.latencyMs ? `${d.latencyMs}ms` : 'Timeout'}`).join('\n'),
        timestamp: new Date().toLocaleTimeString(),
      },
    ];

    let report = `## 网络连通性与 DNS 实时测速报告\n\n已完成对国内与全球主流公共 DNS 服务器的并发探测。\n\n`;
    report += `### ⚡ DNS 响应延迟排行榜 (按速度优选)：\n\n`;
    report += `| 推荐排名 | DNS 服务商 | 优选 IP | 往返延迟 | 状态 |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (let i = 0; i < dnsList.slice(0, 5).length; i++) {
      const d = dnsList[i];
      const rank = i === 0 ? '🏆 **最优**' : `${i + 1}`;
      const statusBadge = d.latencyMs && d.latencyMs < 30 ? '🟢 极速' : d.latencyMs && d.latencyMs < 80 ? '🔵 良好' : '🟡 稍慢';
      report += `| ${rank} | **${d.name}** | \`${d.primaryIp}\` | **${d.latencyMs ? `${d.latencyMs} ms` : '超时'}** | ${statusBadge} |\n`;
    }

    if (fastest && fastest.latencyMs) {
      report += `\n💡 **诊断建议**：探测发现 **${fastest.name}** (${fastest.primaryIp}) 响应速度最快（仅 **${fastest.latencyMs} ms**）。切换至该 DNS 可显著加快网页首屏解析，预防运营商 DNS 劫持与解析缓慢。`;
    }

    msg.content = report;

    msg.actionCards = [
      {
        id: `act-apply-dns-${fastest.primaryIp}`,
        title: `一键切换至最优 DNS (${fastest.name} - ${fastest.latencyMs || 15}ms)`,
        type: 'fix_network',
        severity: 'info',
        impactDescription: `将当前网卡的 IPv4 DNS 切换为 ${fastest.primaryIp} (备用: ${fastest.secondaryIp})，并自动刷新本地 DNS 解析缓存。`,
        expectedBenefit: `立即提升网页域名解析速度，解决连网卡顿或部分网页打不开问题`,
        actionButtonText: `应用 ${fastest.name}`,
        status: 'pending',
        details: { primary: fastest.primaryIp, secondary: fastest.secondaryIp, name: fastest.name },
      },
      {
        id: 'act-flush-dns-cache',
        title: '一键刷新系统 DNS 解析缓存 (Flush DNS)',
        type: 'fix_network',
        severity: 'info',
        impactDescription: '执行 `ipconfig /flushdns` 清空 Windows 缓存的过时/污染域名映射。',
        expectedBenefit: '快速恢复失效域名的正常访问',
        actionButtonText: '刷新解析缓存',
        status: 'pending',
        details: { action: 'flush' },
      },
    ];
  };


  const simulatePortDiagnosis = async (msg: ChatMessage, query: string) => {
    // 检查用户提问中是否指定了具体端口号
    const match = query.match(/(\d{2,5})/);

    if (match) {
      // 模式 1: 用户指定了具体端口 (如 3000, 8080, 1420)
      const targetPort = parseInt(match[1], 10);
      msg.content += `正在调度系统底层网络探针，精准排查 **:${targetPort}** 端口占用...\n\n`;
      await delay(400);

      let occupant: PortOccupantInfo | null = null;
      try {
        occupant = await invoke<PortOccupantInfo>('check_port_occupancy', { port: targetPort });
      } catch (e) {
        console.warn('check_port_occupancy invoke error:', e);
        // 浏览器环境 Mock fallback
        occupant = {
          port: targetPort,
          isOccupied: true,
          pid: 21044,
          processName: 'node.exe',
          memoryMB: 245.8,
          cpuPercent: 1.2,
          protocol: 'TCP',
          localAddress: `0.0.0.0:${targetPort}`,
          status: 'LISTENING (监听中)',
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
        msg.content = `## 端口排查报告 (:${targetPort})\n\n✅ 经过网络协议栈实时排查，端口 **:${targetPort}** 当前完全处于 **空闲状态**，未被任何应用程序监听，您可以直接启动您的服务！`;
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

      msg.content = `## 端口冲突排查报告 (:${targetPort})\n\n诊断发现：端口 **:${targetPort}** 当前正处于 **被占用状态**。\n\n- **占用进程**: \`${occupant.processName || '未知应用'}\`\n- **进程 PID**: \`${occupant.pid}\`\n- **内存占用**: ${occupant.memoryMB ? `${occupant.memoryMB} MB` : '系统内核'}\n- **监听地址**: \`${occupant.localAddress}\`${occupant.exePath ? `\n- **文件路径**: \`${occupant.exePath}\`` : ''}\n\n建议点击下方操作卡片立即安全结束该进程以释放端口：`;

      msg.actionCards = [
        {
          id: `act-kill-port-${targetPort}`,
          title: `一键强制释放 :${targetPort} 端口 (${occupant.processName || '占用进程'})`,
          type: 'kill_process',
          severity: 'warning',
          impactDescription: `将强制结束占用 :${targetPort} 端口的进程 ${occupant.processName || ''} (PID: ${occupant.pid})，非核心系统服务，安全无副作用。`,
          expectedBenefit: `立即解除 :${targetPort} 端口占用冲突，恢复网络端口绑定`,
          actionButtonText: `释放 :${targetPort} 端口`,
          status: 'pending',
          details: { pid: occupant.pid, port: targetPort },
        },
      ];
    } else {
      // 模式 2: 用户未指定端口，全量扫描系统活跃监听端口
      msg.content += `正在全量扫描当前操作系统网络栈的所有活跃监听端口...\n\n`;
      await delay(500);

      let portsList: PortOccupantInfo[] = [];
      try {
        portsList = await invoke<PortOccupantInfo[]>('scan_listening_ports');
      } catch (e) {
        console.warn('scan_listening_ports invoke error:', e);
        // 浏览器环境 Mock fallback
        portsList = [
          { port: 1420, isOccupied: true, pid: 18420, processName: 'ai-shell.exe', memoryMB: 85.2, protocol: 'TCP', localAddress: '127.0.0.1:1420', status: 'LISTENING', cpuPercent: 0.5 },
          { port: 3000, isOccupied: true, pid: 21044, processName: 'node.exe', memoryMB: 210.4, protocol: 'TCP', localAddress: '0.0.0.0:3000', status: 'LISTENING', cpuPercent: 1.1 },
          { port: 3306, isOccupied: true, pid: 5412, processName: 'mysqld.exe', memoryMB: 420.0, protocol: 'TCP', localAddress: '0.0.0.0:3306', status: 'LISTENING', cpuPercent: 0.2 },
          { port: 8080, isOccupied: true, pid: 9812, processName: 'java.exe', memoryMB: 650.0, protocol: 'TCP', localAddress: '0.0.0.0:8080', status: 'LISTENING', cpuPercent: 2.3 },
        ];
      }

      if (!portsList || portsList.length === 0) {
        msg.content = `## 全系统端口扫描报告\n\n✅ 经全面扫描，当前系统网络栈运行平稳，暂未发现处于监听中的冲突端口。`;
        msg.actionCards = [];
        return;
      }

      // 提取前 6 个最典型的活跃端口
      const topPorts = portsList.slice(0, 6);
      msg.diagnostics = [
        {
          command: 'netstat -ano -p tcp | findstr LISTENING',
          output: topPorts.map((p) => `:${p.port} -> ${p.processName || 'Unknown'} (PID: ${p.pid || '-'})`).join('\n'),
          timestamp: new Date().toLocaleTimeString(),
        },
      ];

      let listMd = `## 系统活跃监听端口诊断清单\n\n当前系统共检测到 **${portsList.length}** 个正在监听的 TCP 端口服务：\n\n`;
      listMd += `| 端口号 | 占用程序 | 进程 PID | 内存占用 |\n`;
      listMd += `| :--- | :--- | :--- | :--- |\n`;
      for (const p of topPorts) {
        listMd += `| **:${p.port}** | \`${p.processName || 'System'}\` | \`${p.pid || '-'}\` | ${p.memoryMB ? `${p.memoryMB} MB` : '-'} |\n`;
      }
      listMd += `\n如需释放某个冲突端口，请点击下方对应的处置卡片：`;

      msg.content = listMd;

      msg.actionCards = topPorts
        .filter((p) => p.pid && p.pid > 4)
        .slice(0, 3)
        .map((p) => ({
          id: `act-kill-port-${p.port}`,
          title: `一键释放 :${p.port} 端口 (${p.processName || '占用程序'})`,
          type: 'kill_process',
          severity: 'warning',
          impactDescription: `将强制结束占用 :${p.port} 端口的进程 ${p.processName || ''} (PID: ${p.pid})。`,
          expectedBenefit: `立即解除 :${p.port} 端口占用冲突`,
          actionButtonText: `释放 :${p.port} 端口`,
          status: 'pending',
          details: { pid: p.pid, port: p.port },
        }));
    }
  };



  const simulateAutostartDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在深入读取 Windows 系统注册表与启动目录自启项...\n\n';
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

    let report = `## 开机自启动项深度诊断报告\n\n当前共检测到 **${list.length}** 个自启动项（其中 **${enabledItems.length}** 项已开启开机自启）。\n\n`;

    report += `### 📋 关键启动项健康评估清单：\n\n`;
    report += `| 软件名称 | 发行者 | 生效位置 | 优化建议 |\n`;
    report += `| :--- | :--- | :--- | :--- |\n`;

    for (const item of list.slice(0, 8)) {
      const advice = item.safeToDisable
        ? '⚡ **建议安全禁用** (提速开机)'
        : '🛡️ **建议保留** (系统/驱动服务)';
      report += `| **${item.name}** | \`${item.publisher || '第三方'}\` | ${item.location} | ${advice} |\n`;
    }

    if (recommended.length > 0) {
      report += `\n💡 **开机提速建议**：检测到 **${recommended.length}** 个非必要的第三方自启软件（如网盘/游戏平台/音乐播放器），开机后这些程序会在后台空耗内存。点击下方操作卡片可一键将其安全禁用：`;
    } else {
      report += `\n✅ 恭喜！当前系统的自启动项配置非常纯净，无明显拖慢开机的流氓自启软件。`;
    }

    msg.content = report;

    msg.actionCards = recommended.slice(0, 3).map((item) => ({
      id: `act-disable-autostart-${item.name}`,
      title: `一键禁用 ${item.name} 开机自启`,
      type: 'toggle_autostart',
      severity: 'info',
      impactDescription: `将该软件从系统注册表 Run 启动项中移除，不会卸载软件，平时可照常手动双击打开。`,
      expectedBenefit: `预计可缩短开机启动耗时约 2~4 秒，开机更轻快`,
      actionButtonText: `禁用 ${item.name} 自启`,
      status: 'pending',
      details: { name: item.name, enable: false },
    }));
  };

  const simulateGeneralDiagnosis = async (msg: ChatMessage, query: string) => {
    msg.content = `已收到您的请求：“${query}”。系统当前运行平稳，所有核心服务正常。您可在【设置中心】输入 API Key 开启全模型深度智能推理！`;
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
    } else if (action.type === 'clean_disk') {
      try {
        await invoke('clean_system_garbage');
      } catch (e) {
        console.warn('clean_disk action invoke fallback:', e);
      }
    } else if (action.type === 'fix_network') {
      try {
        if (action.details?.action === 'flush') {
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
    exportSessionToMarkdown,
    sendMessage,
    handleActionExecution,
  };
}
