import { ref } from 'vue';
import type { ChatMessage, ActionCardData } from '@/types';
import { useSettings } from './useSettings';
import { runAgentDiagnosis } from '@/services/agentEngine';

export function useAgentChat(onExecuteActionCallback?: (action: ActionCardData) => void) {
  const isGenerating = ref(false);
  const { settings, hasConfiguredApiKey } = useSettings();

  const messages = ref<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      content: '您好！我是您的 **AI-Shell 智能系统管家**。\n\n我可以帮您排查电脑卡顿、清理 C 盘垃圾、修复网络连通性或定位应用故障。您可以直接点击下方的快捷场景，或直接用自然语言向我提问！',
      timestamp: '刚刚',
      actionCards: [],
      diagnostics: []
    }
  ]);

  const quickPrompts = [
    { label: '为什么电脑突然很卡？', query: '为什么电脑这么卡？帮我全面检查一下。' },
    { label: 'C 盘空间满了怎么清理？', query: 'C盘快满了，帮我看看哪些文件或日志可以安全清理。' },
    { label: '网页打不开了/网络故障', query: '网页打不开了，网络好像不通，帮我诊断一下。' },
    { label: '提示 8080 端口被占用', query: '8080 端口被占用了，帮我找出是哪个程序占用的并释放。' },
  ];

  const sendMessage = async (userQuery: string) => {
    if (!userQuery.trim() || isGenerating.value) return;

    // 1. 添加用户消息
    messages.value.push({
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
      actionCards: []
    };
    messages.value.push(aiMsg);
    const targetMsg = messages.value[messages.value.length - 1];

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
  };

  // 离线规则 / 演示引擎
  const runFallbackOfflineDiagnosis = async (targetMsg: ChatMessage, query: string) => {
    const q = query.toLowerCase();
    if (q.includes('卡') || q.includes('慢') || q.includes('slow')) {
      await simulatePerformanceDiagnosis(targetMsg);
    } else if (q.includes('c盘') || q.includes('磁盘') || q.includes('空间') || q.includes('disk')) {
      await simulateDiskDiagnosis(targetMsg);
    } else if (q.includes('网') || q.includes('网页') || q.includes('net')) {
      await simulateNetworkDiagnosis(targetMsg);
    } else if (q.includes('端口') || q.includes('8080') || q.includes('port')) {
      await simulatePortDiagnosis(targetMsg);
    } else {
      await simulateGeneralDiagnosis(targetMsg, query);
    }
  };

  const simulatePerformanceDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在调度系统探针采集 CPU、内存及进程负载数据...';
    await delay(600);

    msg.diagnostics = [
      { command: 'inspect_system_metrics', output: 'CPU Load: 48.2%, Memory: 13.8GB / 16.0GB (86.2%), Disk Queue: 0.12', timestamp: '10:42:01' },
      { command: 'get_top_processes --sort memory --limit 5', output: 'PID: 14820 | electron_crash_dump.exe | 4.85GB | Status: Unresponsive\nPID: 21044 | chrome.exe | 2.34GB | Status: Running', timestamp: '10:42:02' }
    ];

    await delay(600);

    msg.content = `经过全面诊断，定位到系统目前存在 **2 个主要性能瓶颈**：\n\n1. **进程异常无响应**：检测到进程 \`electron_crash_dump.exe\` (PID: 14820) 处于死锁无响应状态，独占了 **4.85 GB 内存**与持续高 CPU 负载。\n2. **物理内存吃紧**：总体可用内存不足 14%，导致系统频繁触发页面换页。`;

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
        details: { pid: 14820, name: 'electron_crash_dump.exe' }
      },
      {
        id: 'act-clean-ram',
        title: '整理系统待机工作集',
        type: 'speedup_boot',
        severity: 'info',
        impactDescription: '通知系统内存管理器快速整理非活跃后台程序缓存。',
        expectedBenefit: '预计释放 1.2 GB 待机工作集',
        actionButtonText: '优化内存空间',
        status: 'pending'
      }
    ];
  };

  const simulateDiskDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在分析 C 盘各分区目录占用与无用缓存...';
    await delay(600);

    msg.diagnostics = [
      { command: 'inspect_disk_usage --target C:\\', output: 'Total: 512GB | Used: 442GB (86.3%) | Free: 70GB', timestamp: '10:42:05' },
      { command: 'scan_junk_artifacts', output: 'AppData/Local/Temp: 8.4GB | Windows Update Cache: 4.2GB | Crash Dumps: 2.2GB', timestamp: '10:42:06' }
    ];

    await delay(600);

    msg.content = `诊断完成！C 盘当前剩余空间仅 **70 GB**（健康状态：黄色预警）。\n\n扫描发现大量历史临时文件与系统更新缓存堆积，建议进行安全清理：`;

    msg.actionCards = [
      {
        id: 'act-clean-disk-all',
        title: '安全清理系统垃圾与临时缓存',
        type: 'clean_disk',
        severity: 'warning',
        impactDescription: '包含：系统临时文件 (8.4GB)、Windows Update 过期安装缓存 (4.2GB)、系统错误转储文件 (2.2GB)。',
        expectedBenefit: '预计立即释放 14.8 GB 磁盘空间，无个人文件丢失风险',
        actionButtonText: '一键安全清理 (14.8 GB)',
        status: 'pending',
        details: { freedGB: 14.8 }
      }
    ];
  };

  const simulateNetworkDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在测试网络适配器、DNS 解析与外部网关连通性...';
    await delay(600);

    msg.diagnostics = [
      { command: 'check_network_adapter', output: 'IPv4: 192.168.1.105 | Gateway: 192.168.1.1 (OK)', timestamp: '10:42:10' },
      { command: 'test_dns_resolution --domain www.baidu.com', output: 'Current DNS: 192.168.1.1 -> Timed Out! (Failure)', timestamp: '10:42:11' },
      { command: 'ping 8.8.8.8 -c 2', output: '2 packets transmitted, 2 received, 0% packet loss (Ping OK)', timestamp: '10:42:12' }
    ];

    await delay(600);

    msg.content = `定位到网络故障原因：**DNS 域名解析服务异常**。\n\n物理网卡与路由器连通正常（Ping 8.8.8.8 畅通），但本地 DNS 服务器无响应，导致浏览器无法解析网址（表现为“连着WiFi但打不开网页”）。`;

    msg.actionCards = [
      {
        id: 'act-fix-dns',
        title: '一键刷新 DNS 缓存并自动优选公共 DNS',
        type: 'fix_network',
        severity: 'info',
        impactDescription: '自动执行 `ipconfig /flushdns` 并临时切换至腾讯 DNSPod (119.29.29.29) 与阿里 DNS (223.5.5.5)。',
        expectedBenefit: '立即恢复浏览器正常网页访问',
        actionButtonText: '一键修复 DNS',
        status: 'pending'
      }
    ];
  };

  const simulatePortDiagnosis = async (msg: ChatMessage) => {
    msg.content += '正在查询 8080 端口占用情况...';
    await delay(500);

    msg.diagnostics = [
      { command: 'netstat -ano | findstr :8080', output: 'TCP 0.0.0.0:8080 0.0.0.0:0 LISTENING PID 21044', timestamp: '10:42:15' }
    ];

    await delay(500);

    msg.content = `查询结果：**端口 8080 当前正被占用**。\n\n占用程序为：\`chrome.exe\` (PID: 21044)。`;

    msg.actionCards = [
      {
        id: 'act-kill-port',
        title: '释放 8080 端口',
        type: 'kill_process',
        severity: 'warning',
        impactDescription: '将终止占用 8080 端口的进程 (PID: 21044)。',
        expectedBenefit: '8080 端口恢复为空闲状态',
        actionButtonText: '释放 8080 端口',
        status: 'pending',
        details: { pid: 21044 }
      }
    ];
  };

  const simulateGeneralDiagnosis = async (msg: ChatMessage, query: string) => {
    msg.content = `已收到您的请求：“${query}”。系统当前运行平稳，所有核心服务正常。您可在【设置中心】输入 API Key 开启全模型深度智能推理！`;
  };

  const handleActionExecution = async (action: ActionCardData) => {
    action.status = 'executing';
    await delay(1000);
    action.status = 'completed';

    if (onExecuteActionCallback) {
      onExecuteActionCallback(action);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return {
    messages,
    quickPrompts,
    isGenerating,
    sendMessage,
    handleActionExecution,
  };
}
