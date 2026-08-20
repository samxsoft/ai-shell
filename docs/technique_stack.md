# 交互式 AI 系统维护工具箱 (AI-Shell) 技术栈选型与架构方案

本文档针对**面向普通用户的现代化 GUI 智能系统维护工具箱**，对整体技术栈进行深度分析与选型决策，重点评估 **Tauri 2.0** 架构及配套生态。

---

## 1. 核心架构设计：为什么选择 Tauri？

作为一款**“系统维护与诊断工具”**，客户端自身的**资源占用率、启动速度、打包体积与系统安全性**至关重要（如果维护工具自身就占用 500MB 内存和高 CPU，将极大破坏用户体验）。

### 1.1 桌面端 GUI 框架横向对比

| 评估维度 | **Tauri 2.0 (Rust + Web)** ⭐⭐⭐⭐⭐ | **Electron (Node.js + Chromium)** | **PySide6 / PyQt (Qt + Python)** | **Flutter for Desktop** |
| :--- | :--- | :--- | :--- | :--- |
| **打包体积** | **极小 (~10 - 20 MB)**<br>复用系统内置 WebView2 / WebKit | **庞大 (~80 - 150 MB+)**<br>内置完整 Chromium 和 Node.js | **中等 (~50 - 90 MB)**<br>打包 Python 运行时与 Qt 动态库 | **中等 (~30 - 50 MB)** |
| **内存占用** | **极低 (约 25 - 45 MB)** | **较高 (约 150 - 300 MB+)** | **中等 (约 60 - 120 MB)** | **较低 (约 40 - 70 MB)** |
| **UI 视觉与动效** | **现代奢华**（全套现代前端 Web 生态） | **现代奢华**（全套 Web 生态） | **传统/原生**（定制现代皮肤开发成本高） | **现代化**（自绘引擎） |
| **系统底层调用** | **Rust 原生级**，毫秒级采集、内存安全 | 需借助 Node.js C++ Addons | 借助 Python `psutil`，方便但稍慢 | 需通过 Platform Channel |
| **安全性与沙箱** | **最高**（严格的 Rust 权限隔离与 IPC 校验） | 较低（需防范 Node 集成带来的 XSS 逃逸） | 中等 | 高 |

> [!TIP]
> **选型结论**：**Tauri 2.0** 是开发系统维护工具的黄金选择。既能享受 **Vue 3 / React** 带来的现代化极简美观界面，又能凭借 **Rust** 获得极速的底层系统探针能力与极致轻量的资源开销。

---

## 2. 总体技术栈清单 (Tech Stack Blueprint)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        前端展示层 (Frontend UI)                        │
│   Vue 3 (Composition API) / React 18 + TypeScript + Vite 5            │
│   Tailwind CSS + Shadcn-Vue / Radix UI + Lucide 图标 + ECharts         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  Tauri IPC (强类型异步事件/指令)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Tauri 宿主与原生后端 (Rust Backend)                 │
│   • Tauri 2.0 Core (窗口生命周期、托盘管理、系统通知)                 │
│   • 系统探针模块 (sysinfo, netstat2, whoami)                          │
│   • 脚本/命令执行器 (std::process, UAC 提权提请)                       │
│   • 本地安全审计与配置存储 (tauri-plugin-store / SQLite)              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  HTTP / Server-Sent Events (SSE)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AI Agent & LLM 接入层 (AI Service)                   │
│   • 协议兼容：OpenAI Compatible API (支持 DeepSeek, Qwen, Claude, GPT)│
│   • 本地模型：一键探测并直连本地 Ollama (127.0.0.1:11434)              │
│   • Agent 架构：轻量级 ReAct 循环 + Function Calling 动态工具路由      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 分层技术选型详解

### 3.1 前端交互层 (Frontend)
- **核心框架**：`Vue 3` + `TypeScript` + `Vite` (或 `React 18`)
  - 响应式数据流优秀，开发体验极快，配合 Vite 构建秒级热重载。
- **UI 与组件库**：
  - **样式系统**：`Tailwind CSS`（原子化 CSS，易于打造毛玻璃、暗黑模式与流畅渐变）。
  - **组件库**：`Shadcn-Vue` / `Radix UI`（无头组件库，极度现代化、干净无多余冗余代码）。
  - **图标库**：`Lucide-Vue-Next`（统一轻量、高质感线条图标）。
- **图表与可视化**：
  - `Apache ECharts` 或 `Chart.js`：绘制 CPU 实时波形曲线、内存动态波浪图、磁盘分类环形图。
- **状态管理**：
  - `Pinia`：管理全局系统指标流、当前会话历史、用户配置与主题切换。

### 3.2 桌面宿主与底层探针 (Rust / Tauri Backend)
- **Tauri 2.0 核心插件**：
  - `@tauri-apps/plugin-shell`：受控安全执行系统命令。
  - `@tauri-apps/plugin-store`：本地持久化保存用户的 API Key、自定义排障配置。
  - `@tauri-apps/plugin-notification`：后台检测到异常指标时触发系统原生横幅告警。
  - `@tauri-apps/plugin-autostart`：支持开机自启（可选）。
- **系统探针 Crates (Rust 核心生态)**：
  - `sysinfo`：高性能跨平台获取 CPU/GPU 负载、内存/SWAP、进程树、磁盘分区使用率与网络吞吐。
  - `netstat2` / `pnet`：端口监听占用扫描、当前活跃 TCP/UDP 网络连接检测。
  - `winreg` (Windows 特供)：安全扫描与管理注册表开机自启项。
  - `which`：检测系统是否安装了特定维护工具（如 Docker, Git, Nginx, Ollama 等）。

### 3.3 AI Agent 与大模型交互 (AI Agent Engine)
- **通信方式**：通过 Rust `reqwest` 异步 HTTP 客户端实现 **SSE 流式传输**，直接推送流式文本与操作指令到前端。
- **支持的模型服务**：
  1. **云端主流大模型**：
     - DeepSeek (V3 / R1)
     - 通义千问 (Qwen-Max / Qwen-Plus)
     - OpenAI (GPT-4o / GPT-4o-mini)
     - Claude 3.5 Sonnet
  2. **本地离线大模型**：
     - 自动探测本地 `Ollama` (如 `qwen2.5:7b`、`deepseek-r1:8b`、`llama3.1:8b`)，断网离线环境下依然可以使用全部诊断功能。
- **Agent 工具调用规范**：
  - 采用标准 **OpenAI Tool Calling (JSON Schema)**，由 LLM 决定调用哪类探针工具（如 `get_system_overview`、`kill_process`、`scan_disk_hogs` 等）。

---

## 4. 关键架构与核心流程设计

### 4.1 前端与 Rust 后端通信机制 (Tauri Commands)

```rust
// 示例：Rust 端暴露的高性能系统探针 Command
#[tauri::command]
pub async fn get_system_metrics() -> Result<SystemMetrics, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    Ok(SystemMetrics {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        memory_used: sys.used_memory(),
        memory_total: sys.total_memory(),
        disks: scan_disks(&sys),
    })
}
```

前端 Vue3 直接强类型调用：
```typescript
import { invoke } from "@tauri-apps/api/core";

const metrics = await invoke<SystemMetrics>("get_system_metrics");
```

### 4.2 智能排障与 Action Card 执行流程

```
[用户提问: "电脑为什么这么慢？"]
             │
             ▼
[LLM 意图解析: 判定需执行 System Probe]
             │ (返回 Tool Call: get_system_metrics + get_top_processes)
             ▼
[Tauri 执行 Rust 探针, 毫秒级采集数据并回传 LLM]
             │
             ▼
[LLM 生成结构化诊断报告 + 可交互 Action Card]
             │
             ▼
[前端 UI 渲染: 红黄色警示卡片 + "一键结束高占用进程" 按钮]
             │
             ▼ (用户点击按钮)
[前端发起 invoke("safe_kill_process", { pid: 1234 })]
             │
             ▼
[Rust 安全校验白名单 -> 执行系统调用 -> 刷新系统看板]
```

---

## 5. 开发与构建部署方案

### 5.1 本地开发环境要求
- **Node.js**：v18+ 或 v20+ (使用 pnpm 作为包管理器)
- **Rust Toolchain**：`rustc` / `cargo` 1.75+
- **Windows 依赖**：C++ Build Tools, WebView2 (Windows 10/11 已原生内置)

### 5.2 生产打包与分发 (CI/CD)
借助 Tauri CLI 与 GitHub Actions 自动化多平台构建：
- **Windows**：输出 `.msi` 安装包及单文件免安装版 `.exe`。
- **macOS**：输出通用架构（Apple Silicon + Intel）`.dmg` 安装包。
- **Linux**：输出 `.AppImage` 及 `.deb` 安装包。
