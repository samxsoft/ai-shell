import type { UserSettings } from '@/types';

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
 * 统一 OpenAI Compatible 大模型请求客户端
 */
export async function sendChatCompletion(
  settings: UserSettings,
  messages: ChatMessageParam[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
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
