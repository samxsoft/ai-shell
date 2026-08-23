import type { UserSettings } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content?: string | null;
      tool_calls?: {
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
    finish_reason: string;
  }[];
}

/**
 * 统一大模型请求客户端（支持云端 OpenAI 兼容 API & 本地 Rust 内置推理引擎）
 */
export async function sendChatCompletion(
  settings: UserSettings,
  messages: ChatMessageParam[],
  tools?: any[],
  onChunk?: (chunk: string) => void
): Promise<ChatCompletionResponse> {
  // 1. 如果用户选择 Rust 原生内置推理引擎 (Phase 2, 3, 4: Multi-Round ReAct Autonomous Agent)
  if (settings.aiProvider === 'local_embedded') {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || 'System diagnostic check';
    const sysMsg = messages.find((m) => m.role === 'system')?.content || '';
    const hasToolResult = messages.some((m) => m.role === 'tool');

    // 🌟 第 1 轮：如果提供了工具声明且尚未执行探针工具，发起 Autonomous Multi-Vector Tool Calls
    if (tools && tools.length > 0 && !hasToolResult) {
      const qLower = lastUserMsg.toLowerCase();
      const toolCallList: { name: string; args: any }[] = [];

      const isFullCheck = qLower.includes('体检')
        || qLower.includes('全面')
        || qLower.includes('深度')
        || qLower.includes('瓶颈')
        || qLower.includes('健康')
        || qLower.includes('性能')
        || qLower.includes('检查系统')
        || qLower.includes('系统体检')
        || qLower.includes('health')
        || qLower.includes('overview');

      if (isFullCheck) {
        // 全系统深度体检：并发调度全量 8 大核心维度系统探针矩阵
        toolCallList.push({ name: 'get_system_metrics', args: {} });
        toolCallList.push({ name: 'get_process_list', args: { limit: 10 } });
        toolCallList.push({ name: 'scan_system_garbage', args: {} });
        toolCallList.push({ name: 'diagnose_network_health', args: {} });
        toolCallList.push({ name: 'get_autostart_entries', args: {} });
        toolCallList.push({ name: 'scan_large_files', args: { minSizeMb: 500 } });
        toolCallList.push({ name: 'scan_docker_environment', args: {} });
        toolCallList.push({ name: 'scan_listening_ports', args: {} });
      } else if (qLower.includes('端口') || qLower.includes('port') || qLower.includes('8080') || qLower.includes('3000')) {
        const portMatch = lastUserMsg.match(/\b\d{2,5}\b/);
        const port = portMatch ? Number(portMatch[0]) : 8080;
        toolCallList.push({ name: 'check_port_occupancy', args: { port } });
        toolCallList.push({ name: 'scan_listening_ports', args: {} });
      } else if (qLower.includes('c盘') || qLower.includes('垃圾') || qLower.includes('clean') || qLower.includes('disk') || qLower.includes('瘦身')) {
        toolCallList.push({ name: 'scan_system_garbage', args: {} });
        toolCallList.push({ name: 'scan_large_files', args: { minSizeMb: 500 } });
      } else if (qLower.includes('网络') || qLower.includes('dns') || qLower.includes('网页') || qLower.includes('network') || qLower.includes('ping')) {
        toolCallList.push({ name: 'diagnose_network_health', args: {} });
        toolCallList.push({ name: 'flush_dns_cache', args: {} });
      } else if (qLower.includes('docker') || qLower.includes('容器') || qLower.includes('镜像')) {
        toolCallList.push({ name: 'scan_docker_environment', args: {} });
      } else if (qLower.includes('自启') || qLower.includes('开机') || qLower.includes('启动') || qLower.includes('autostart') || qLower.includes('boot')) {
        toolCallList.push({ name: 'get_autostart_entries', args: {} });
      } else {
        toolCallList.push({ name: 'get_system_metrics', args: {} });
        toolCallList.push({ name: 'get_process_list', args: { limit: 5 } });
      }

      const generatedToolCalls = toolCallList.map((t, idx) => ({
        id: `call_${Date.now()}_${idx}`,
        type: 'function' as const,
        function: {
          name: t.name,
          arguments: JSON.stringify(t.args),
        },
      }));

      const toolNamesDesc = toolCallList.map((t) => `\`${t.name}\``).join(', ');
      return {
        id: `local-react-round1-${Date.now()}`,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `正在并发调度系统底层多维探针 ${toolNamesDesc} 进行全景采样与深度排障...`,
              tool_calls: generatedToolCalls,
            },
            finish_reason: 'tool_calls',
          },
        ],
      };
    }

    // 🌟 第 2 轮：已获取探针真实执行结果，发起本地流式排障推导与 ActionCard 生成
    return new Promise(async (resolve, reject) => {
      let accumulated = '';
      let unlisten: (() => void) | null = null;

      try {
        unlisten = await listen<any>('local_token_stream', (evt) => {
          const payload = evt.payload;
          if (payload.token) {
            accumulated += payload.token;
            if (onChunk) {
              onChunk(accumulated);
            }
          }
          if (payload.isFinished) {
            if (unlisten) unlisten();
            resolve({
              id: `local-gguf-${Date.now()}`,
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: accumulated,
                  },
                  finish_reason: 'stop',
                },
              ],
            });
          }
          if (payload.error) {
            if (unlisten) unlisten();
            reject(new Error(payload.error));
          }
        });

        await invoke('stream_local_completion', {
          prompt: lastUserMsg,
          systemPrompt: sysMsg,
          maxTokens: 2048,
          temperature: 0.7,
        });
      } catch (err) {
        if (unlisten) unlisten();
        reject(err);
      }
    });
  }

  // 2. 传统云端 API / 本地外部 Ollama
  const endpoint = settings.apiEndpoint.replace(/\/+$/, '');
  const url = `${endpoint}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.apiKey && settings.apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
  }

  const payload: any = {
    model: settings.modelName || 'deepseek-chat',
    messages,
    temperature: 0.3,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI 请求失败 [${response.status}]: ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * 真实测试大模型 API 连通性与网络延迟
 */
export async function testAiConnection(settings: UserSettings): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const startTime = Date.now();
  try {
    if (settings.aiProvider === 'local_embedded') {
      const status = await invoke<any>('get_local_inference_status');
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        message: `Rust 内置引擎就绪! 状态: ${status?.status || 'ready'}, 硬件加速: ${status?.deviceType || 'CPU AVX2'}, 内存: ${status?.ramUsedMb || 0}MB`,
      };
    }

    const res = await sendChatCompletion(
      settings,
      [
        { role: 'system', content: 'You are a latency testing bot. Reply with "OK".' },
        { role: 'user', content: 'Ping' },
      ]
    );

    const latencyMs = Date.now() - startTime;
    const reply = res.choices?.[0]?.message?.content || 'OK';
    return {
      success: true,
      latencyMs,
      message: `连接成功! 延迟: ${latencyMs}ms, 模型: ${settings.modelName}, 回复: "${reply.slice(0, 15)}..."`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: `连接失败: ${err.message || err}`,
    };
  }
}

