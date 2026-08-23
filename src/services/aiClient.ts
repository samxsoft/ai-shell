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
  tools?: any[]
): Promise<ChatCompletionResponse> {
  // 1. 如果用户选择 Rust 原生内置推理引擎 (Phase 2)
  if (settings.aiProvider === 'local_embedded') {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || 'System diagnostic check';
    const sysMsg = messages.find((m) => m.role === 'system')?.content || '';

    return new Promise(async (resolve, reject) => {
      let accumulated = '';
      let unlisten: (() => void) | null = null;

      try {
        unlisten = await listen<any>('local_token_stream', (evt) => {
          const payload = evt.payload;
          if (payload.token) {
            accumulated += payload.token;
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

