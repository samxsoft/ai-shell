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
  exePath?: string;
}


export interface AutostartEntry {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  description?: string;
  publisher?: string;
  impact?: 'high' | 'medium' | 'low';
  safeToDisable?: boolean;
}


export interface DnsPingResult {
  name: string;
  primaryIp: string;
  secondaryIp: string;
  latencyMs?: number;
  isCurrent: boolean;
  status: 'fast' | 'normal' | 'slow' | 'unreachable';
}

export interface GarbageItem {
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  description: string;
}

export interface GarbageScanResult {
  totalBytes: number;
  totalFormatted: string;
  items: GarbageItem[];
}

export interface LargeFileInfo {
  path: string;
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  fileType: 'virtual_disk' | 'archive' | 'media' | 'installer' | 'database' | 'other';
  modifiedTime: string;
}

export interface ProcessItem {

  pid: number;
  name: string;
  cpuPercent: number;
  memoryMB: number;
  status: 'running' | 'sleeping' | 'unresponsive';
  isSafeToKill: boolean;
  category: 'user' | 'system' | 'background';
  exe_path?: string;
}

export interface DockerContainerItem {

  id: string;
  names: string;
  image: string;
  status: string;
  state: string;
  size: string;
  created: string;
}

export interface DockerImageItem {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdSince: string;
  isDangling: boolean;
}

export interface DockerOverview {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  containersCount: number;
  stoppedContainersCount: number;
  imagesCount: number;
  danglingImagesCount: number;
  volumesCount: number;
  imagesSize: string;
  imagesReclaimable: string;
  containersSize: string;
  containersReclaimable: string;
  volumesSize: string;
  volumesReclaimable: string;
  buildCacheSize: string;
  buildCacheReclaimable: string;
  totalReclaimable: string;
  stoppedContainers: DockerContainerItem[];
  danglingImages: DockerImageItem[];
}



export interface ActionCardData {
  id: string;
  title: string;
  type: 'kill_process' | 'clean_disk' | 'fix_network' | 'speedup_boot' | 'toggle_autostart' | 'general';
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
  summary?: string;
  timestamp: string;
  isStreaming?: boolean;
  diagnostics?: DiagnosticLog[];
  aiDebugLogs?: AiDebugLog[];
  actionCards?: ActionCardData[];
}


export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
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
  language?: 'zh-CN' | 'en-US' | 'system';
}

export interface NetworkDiagnosisResult {
  localIp: string;
  gatewayIp: string;
  gatewayPingMs?: number;
  publicDnsPingMs?: number;
  dnsResolveOk: boolean;
  dnsResolveMs?: number;
  httpAccessOk: boolean;
  httpStatusCode?: number;
  httpLatencyMs?: number;
  adapterName: string;
  overallStatus: 'healthy' | 'dns_failed' | 'gateway_unreachable' | 'offline';
  summaryText: string;
}

