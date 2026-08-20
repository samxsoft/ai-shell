export type NavTab = 'chat' | 'monitor' | 'toolbox' | 'settings';

export interface SystemMetrics {
  healthScore: number; // 0 - 100
  healthStatus: 'optimal' | 'warning' | 'critical';
  cpuUsage: number; // 0 - 100
  cpuCores?: number;
  physicalCores?: number;
  cpuTemp?: number;
  memoryUsedGB: number;
  memoryTotalGB: number;
  memoryUsagePercent: number;
  primaryDiskName?: string;
  diskUsedGB: number;
  diskTotalGB: number;
  diskUsagePercent: number;
  networkUpKBps: number;
  networkDownKBps: number;
  uptimeHours: number;
  processCount: number;
  osName?: string;
  hostName?: string;
}

export interface PortOccupantInfo {
  port: number;
  isOccupied: boolean;
  pid?: number;
  processName?: string;
  memoryMB?: number;
  cpuPercent?: number;
  protocol: string;
  localAddress: string;
  status: string;
}

export interface AutostartEntry {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  description?: string;
}

export interface DnsPingResult {
  name: string;
  primaryIp: string;
  secondaryIp: string;
  latencyMs?: number;
  isCurrent: boolean;
  status: 'fast' | 'normal' | 'slow' | 'unreachable';
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMB: number;
  status: 'running' | 'sleeping' | 'unresponsive';
  isSafeToKill: boolean;
  category: 'user' | 'system' | 'background';
}

export interface ActionCardData {
  id: string;
  title: string;
  type: 'kill_process' | 'clean_disk' | 'fix_network' | 'speedup_boot' | 'general';
  severity: 'info' | 'warning' | 'danger';
  impactDescription: string;
  expectedBenefit: string;
  actionButtonText: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  details?: Record<string, any>;
}

export interface DiagnosticLog {
  timestamp: string;
  command: string;
  output: string;
}

export interface AiDebugLog {
  title: string;
  type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'error';
  timestamp: string;
  payload: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  diagnostics?: DiagnosticLog[];
  aiDebugLogs?: AiDebugLog[];
  actionCards?: ActionCardData[];
}

export interface ToolboxItem {
  id: string;
  name: string;
  description: string;
  category: 'speed' | 'disk' | 'network' | 'security';
  icon: string;
  badge?: string;
  color: string;
}

export interface UserSettings {
  aiProvider: 'deepseek' | 'openai' | 'claude' | 'qwen' | 'ollama';
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  ollamaDetected: boolean;
  autoDiagnosticOnStartup: boolean;
  requireConfirmForDangerousActions: boolean;
  theme: 'dark' | 'light' | 'system';
}
