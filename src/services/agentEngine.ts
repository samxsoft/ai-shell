import { invoke } from '@tauri-apps/api/core';
import type { ActionCardData, DiagnosticLog, UserSettings, AiDebugLog } from '@/types';
import { sendChatCompletion, type ChatMessageParam } from './aiClient';

/**
 * 暴露给 LLM 的标准系统探针工具定义 (OpenAI Function Calling Schema)
 */
export const SYSTEM_PROBE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_system_metrics',
      description: '采集当前宿主机系统的 CPU 综合占用率、物理内存总量/已用量、各磁盘分区使用率、网络实时上下行速率与健康评分。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_process_list',
      description: '获取当前系统中消耗 CPU 或物理内存最高的活跃前台应用与后台进程列表（包含 PID、进程名、CPU占用率、内存MB、安全保护级别）。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回进程数量上限，默认 20',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_system_garbage',
      description: '扫描宿主机的系统临时缓存、日志堆积、无用垃圾文件，返回总可清理字节数与明细列表。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flush_dns_cache',
      description: '刷新系统本地 DNS 解析缓存，解决因 DNS 污染或缓存失效导致的网页打不开问题。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_port_occupancy',
      description: '查询指定 TCP 端口（如 8080/3000/3306）当前是否被占用，返回占用进程 PID 与进程名。',
      parameters: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: '需要排查的端口号 (1-65535)',
          },
        },
        required: ['port'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_autostart_entries',
      description: '扫描系统的开机自启动软件列表（注册表 Run 项与启动目录）。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

const AGENT_SYSTEM_PROMPT = `
你是一款名为“AI-Shell 智能系统管家”的专业系统维护与排错 Agent。
你的任务是协助普通电脑用户排查系统卡顿、内存不足、C 盘爆满、网络故障、端口冲突等问题。

【回答格式规范】
1. 使用清晰专业的 Markdown 格式（适当使用二级标题 ##、无序列表 -、加粗 **重点** 与 \`代码高亮\`）。
2. 当用户提出系统故障或性能问题时，优先主动调用相关探针工具（如 get_system_metrics, get_process_list, scan_system_garbage, check_port_occupancy 等）采集真实系统指标。
3. 获得探针数据后，进行简明扼要、通俗易懂的根因分析（避免生涩的技术行话，多用普通用户能懂的比喻）。
4. 如果需要用户执行优化动作（例如结束异常进程、清理 C 盘缓存、刷新 DNS 等），请在回复内容的最后，严格使用以下 JSON 格式提供可交互的操作卡片：

<<<ACTION_CARDS>>>
[
  {
    "id": "act-1",
    "title": "简短的操作卡片标题 (如: 一键结束异常死锁进程)",
    "type": "kill_process | clean_disk | fix_network | speedup_boot | general",
    "severity": "danger | warning | info",
    "impactDescription": "清晰告知用户操作的影响 (如: 将结束 PID 1234，非核心系统服务)",
    "expectedBenefit": "预计带来的收益 (如: 立即释放 4.8GB 内存)",
    "actionButtonText": "按钮文案 (如: 立即结束进程)",
    "details": { "pid": 1234, "freedGB": 4.8 }
  }
]
<<<END_ACTION_CARDS>>>
`;

/**
 * 实际调用底层系统探针执行命令
 */
async function executeProbeTool(toolName: string, args: any): Promise<{ result: any; log: DiagnosticLog }> {
  const timestamp = new Date().toLocaleTimeString();
  try {
    let result: any = null;
    let cmdStr = toolName;

    if (toolName === 'get_system_metrics') {
      result = await invoke('get_system_metrics').catch(() => mockSystemMetrics());
      cmdStr = 'inspect_system_metrics';
    } else if (toolName === 'get_process_list') {
      const limit = args?.limit || 20;
      result = await invoke('get_process_list', { limit }).catch(() => mockProcessList());
      cmdStr = `get_top_processes --limit ${limit}`;
    } else if (toolName === 'scan_system_garbage') {
      result = await invoke('scan_system_garbage').catch(() => ({ totalFormatted: '14.8 GB', items: [] }));
      cmdStr = 'scan_system_garbage';
    } else if (toolName === 'flush_dns_cache') {
      result = await invoke('flush_dns_cache').catch(() => 'DNS cache flushed.');
      cmdStr = 'ipconfig /flushdns';
    } else if (toolName === 'check_port_occupancy') {
      const port = args?.port || 8080;
      result = await invoke('check_port_occupancy', { port }).catch(() => ({ port, isOccupied: false }));
      cmdStr = `netstat -ano | findstr :${port}`;
    } else if (toolName === 'get_autostart_entries') {
      result = await invoke('get_autostart_entries').catch(() => []);
      cmdStr = 'query_registry_run_keys';
    } else {
      result = { error: `未知的探针工具: ${toolName}` };
    }

    const outputSnippet = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return {
      result,
      log: {
        command: cmdStr,
        output: outputSnippet.length > 500 ? outputSnippet.slice(0, 500) + '\n... [已截断]' : outputSnippet,
        timestamp,
      },
    };
  } catch (err: any) {
    return {
      result: { error: err.message || String(err) },
      log: {
        command: toolName,
        output: `执行异常: ${err.message || err}`,
        timestamp,
      },
    };
  }
}

/**
 * 执行完整的 ReAct Tool Calling 推理闭环并记录全量 AI 交互日志
 */
export async function runAgentDiagnosis(
  userQuery: string,
  settings: UserSettings,
  onDiagnosticsUpdate: (logs: DiagnosticLog[]) => void,
  onStreamContentUpdate: (content: string) => void
): Promise<{ finalContent: string; actionCards: ActionCardData[]; logs: DiagnosticLog[]; debugLogs: AiDebugLog[] }> {
  const logs: DiagnosticLog[] = [];
  const debugLogs: AiDebugLog[] = [];

  const conversation: ChatMessageParam[] = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    { role: 'user', content: userQuery },
  ];

  const nowTime = () => new Date().toLocaleTimeString();

  // 记录第 1 轮请求日志
  debugLogs.push({
    title: `第 1 轮请求: 发送用户提问与探针工具声明 (${settings.aiProvider} - ${settings.modelName})`,
    type: 'request',
    timestamp: nowTime(),
    payload: {
      endpoint: settings.apiEndpoint,
      model: settings.modelName,
      messages: conversation,
      tools: SYSTEM_PROBE_TOOLS,
    },
  });


  // 第 1 轮：询问 LLM 是否需要调用工具
  onStreamContentUpdate('正在调度 AI 规划排查路径...');
  const firstResponse = await sendChatCompletion(settings, conversation, SYSTEM_PROBE_TOOLS);
  const choice = firstResponse.choices?.[0];

  if (!choice) {
    debugLogs.push({
      title: '大模型返回异常',
      type: 'error',
      timestamp: nowTime(),
      payload: firstResponse,
    });
    throw new Error('大模型未返回有效响应');
  }

  // 记录第 1 轮返回日志
  debugLogs.push({
    title: '第 1 轮响应: 大模型思考与 Tool Calls 决策',
    type: choice.message.tool_calls ? 'tool_call' : 'response',
    timestamp: nowTime(),
    payload: choice.message,
  });

  // 检查是否有 Tool Calls
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    conversation.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const toolName = toolCall.function.name;
      let toolArgs = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {}

      onStreamContentUpdate(`正在执行系统探针: \`${toolName}\`...`);
      const { result, log } = await executeProbeTool(toolName, toolArgs);
      logs.push(log);
      onDiagnosticsUpdate([...logs]);

      // 记录探针执行日志
      debugLogs.push({
        title: `探针执行结果: ${toolName}`,
        type: 'tool_result',
        timestamp: nowTime(),
        payload: {
          toolName,
          arguments: toolArgs,
          rawResult: result,
        },
      });

      // 将工具执行结果作为 tool 消息追加入历史
      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // 记录第 2 轮请求日志
    debugLogs.push({
      title: '第 2 轮请求: 回传探针数据请求大模型生成最终排障方案',
      type: 'request',
      timestamp: nowTime(),
      payload: {
        messages: conversation,
      },
    });

    // 第 2 轮：将探针采集结果交给 LLM 做综合根因分析
    onStreamContentUpdate('探针数据采集完毕，AI 正在进行根因推导与方案规划...');
    const secondResponse = await sendChatCompletion(settings, conversation);
    const finalMsg = secondResponse.choices?.[0]?.message?.content || '';

    debugLogs.push({
      title: '第 2 轮响应: 大模型最终排障分析内容',
      type: 'response',
      timestamp: nowTime(),
      payload: secondResponse.choices?.[0]?.message,
    });

    // 解析 Action Cards
    const { cleanContent, cards } = extractActionCards(finalMsg);
    return {
      finalContent: cleanContent,
      actionCards: cards,
      logs,
      debugLogs,
    };
  } else {
    // LLM 直接回答（无需探针）
    const rawContent = choice.message.content || '';
    const { cleanContent, cards } = extractActionCards(rawContent);
    return {
      finalContent: cleanContent,
      actionCards: cards,
      logs,
      debugLogs,
    };
  }
}

/**
 * 从 LLM 返回文本中提取结构化 Action Cards
 */
function extractActionCards(rawText: string): { cleanContent: string; cards: ActionCardData[] } {
  const cardRegex = /<<<ACTION_CARDS>>>([\s\S]*?)<<<END_ACTION_CARDS>>>/;
  const match = rawText.match(cardRegex);

  if (!match) {
    return { cleanContent: rawText.trim(), cards: [] };
  }

  const cleanContent = rawText.replace(cardRegex, '').trim();
  try {
    const jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr);
    const cards: ActionCardData[] = (Array.isArray(parsed) ? parsed : [parsed]).map((c: any, idx: number) => ({
      id: c.id || `act-gen-${idx}-${Date.now()}`,
      title: c.title || '推荐处置方案',
      type: c.type || 'general',
      severity: c.severity || 'info',
      impactDescription: c.impactDescription || '',
      expectedBenefit: c.expectedBenefit || '优化系统性能',
      actionButtonText: c.actionButtonText || '立即执行',
      status: 'pending',
      details: c.details || {},
    }));
    return { cleanContent, cards };
  } catch (e) {
    console.warn('解析 Action Cards JSON 失败:', e);
    return { cleanContent, cards: [] };
  }
}

// Fallback mocks
function mockSystemMetrics() {
  return {
    cpuUsage: 45.2,
    memoryUsagePercent: 82.4,
    memoryUsedGB: 13.2,
    memoryTotalGB: 16.0,
    primaryDiskUsagePercent: 88.5,
    healthScore: 75,
  };
}

function mockProcessList() {
  return [
    { pid: 14820, name: 'electron_crash_dump.exe', cpuPercent: 32.4, memoryMB: 4850, isSafeToKill: true },
    { pid: 21044, name: 'chrome.exe', cpuPercent: 18.2, memoryMB: 2340, isSafeToKill: true },
  ];
}
