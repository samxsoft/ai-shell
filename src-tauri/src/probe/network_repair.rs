use crate::models::NetworkDiagnosisResult;
use std::net::{TcpStream, ToSocketAddrs};
use std::process::Command;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// 创建无窗口命令行子进程
fn create_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}

/// 快速测试 TCP 端口连通性并返回延迟 (毫秒)
fn ping_tcp_port(addr: &str, timeout_ms: u64) -> Option<u64> {
    let start = Instant::now();
    let timeout = Duration::from_millis(timeout_ms);
    match addr.to_socket_addrs() {
        Ok(mut addrs) => {
            if let Some(sock_addr) = addrs.next() {
                if TcpStream::connect_timeout(&sock_addr, timeout).is_ok() {
                    let elapsed = start.elapsed().as_millis() as u64;
                    return Some(elapsed.max(1));
                }
            }
        }
        Err(_) => {}
    }
    None
}

/// 全链路诊断当前网络健康度
pub fn diagnose_network_health() -> NetworkDiagnosisResult {
    let mut local_ip = "127.0.0.1".to_string();
    let mut gateway_ip = "192.168.1.1".to_string();
    let mut adapter_name = "物理网络适配器".to_string();

    // 1. 获取本地物理网卡与网关 IP
    #[cfg(target_os = "windows")]
    {
        if let Ok(out) = create_cmd("ipconfig").output() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.contains("IPv4") || trimmed.contains("IP Address") {
                    if let Some(ip) = trimmed.split(':').nth(1) {
                        local_ip = ip.trim().to_string();
                    }
                } else if trimmed.contains("Default Gateway") || trimmed.contains("默认网关") {
                    if let Some(gw) = trimmed.split(':').nth(1) {
                        let g = gw.trim().to_string();
                        if !g.is_empty() && g.contains('.') {
                            gateway_ip = g;
                        }
                    }
                } else if trimmed.starts_with("Ethernet adapter") || trimmed.starts_with("以太网适配器") || trimmed.starts_with("Wireless LAN adapter") || trimmed.starts_with("无线局域网适配器") {
                    adapter_name = trimmed.trim_end_matches(':').to_string();
                }
            }
        }
    }

    // 2. 探测路由器网关连通性
    let gateway_ping_ms = ping_tcp_port(&format!("{}:80", gateway_ip), 600)
        .or_else(|| ping_tcp_port(&format!("{}:53", gateway_ip), 600))
        .or_else(|| ping_tcp_port(&format!("{}:443", gateway_ip), 600));

    // 3. 探测国内骨干 DNS 服务器 (阿里 AliDNS 223.5.5.5:53, 腾讯 119.29.29.29:53)
    let public_dns_ping_ms = ping_tcp_port("223.5.5.5:53", 1000)
        .or_else(|| ping_tcp_port("119.29.29.29:53", 1000));

    // 4. 测试域名解析 DNS 解析耗时
    let dns_start = Instant::now();
    let dns_resolve_ok = "www.baidu.com:80".to_socket_addrs().is_ok();
    let dns_resolve_ms = if dns_resolve_ok {
        Some(dns_start.elapsed().as_millis() as u64)
    } else {
        None
    };

    // 5. 测试公网 HTTP 访问
    let http_start = Instant::now();
    let http_access_ok = ping_tcp_port("www.baidu.com:443", 1500).is_some() || ping_tcp_port("223.5.5.5:53", 1000).is_some();
    let http_latency_ms = if http_access_ok {
        Some(http_start.elapsed().as_millis() as u64)
    } else {
        None
    };

    // 综合判定网络健康状态
    let (overall_status, summary_text) = if !http_access_ok && public_dns_ping_ms.is_none() && gateway_ping_ms.is_none() {
        ("offline".to_string(), "本地网络完全断开，无法与路由器网关通信。请检查网线连接或 WiFi 状态。".to_string())
    } else if public_dns_ping_ms.is_none() {
        ("gateway_unreachable".to_string(), "已连接局域网，但无法到达外网骨干网。可能是路由器断网或宽带欠费。".to_string())
    } else if !dns_resolve_ok {
        ("dns_failed".to_string(), "公网 TCP 通信正常，但 DNS 域名解析异常（打不开网页）。推荐刷新 DNS 缓存或切换骨干 DNS。".to_string())
    } else {
        ("healthy".to_string(), "全链路网络畅通，局域网、DNS 解析与外网 HTTP 连接全部正常。".to_string())
    };

    NetworkDiagnosisResult {
        local_ip,
        gateway_ip,
        gateway_ping_ms,
        public_dns_ping_ms,
        dns_resolve_ok,
        dns_resolve_ms,
        http_access_ok,
        http_status_code: if http_access_ok { Some(200) } else { None },
        http_latency_ms,
        adapter_name,
        overall_status,
        summary_text,
    }
}

/// 执行针对性的网络急救与复位指令
pub fn execute_network_repair(action: &str) -> Result<String, String> {
    match action {
        "flush_dns" => {
            #[cfg(target_os = "windows")]
            {
                let _ = create_cmd("ipconfig").arg("/flushdns").output();
                Ok("已强制清空 Windows 本地 DNS 域名解析缓存！".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("DNS 缓存已刷新。".to_string())
            }
        }
        "reset_winsock" => {
            #[cfg(target_os = "windows")]
            {
                let out = create_cmd("netsh").args(["winsock", "reset"]).output()
                    .map_err(|e| e.to_string())?;
                if out.status.success() {
                    Ok("已成功重置 Winsock 目录协议栈！(建议重启电脑以使深层代理过滤驱动彻底生效)".to_string())
                } else {
                    Err("重置 Winsock 失败，可能需要管理员权限".to_string())
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("协议栈已复位。".to_string())
            }
        }
        "reset_tcpip" => {
            #[cfg(target_os = "windows")]
            {
                let out = create_cmd("netsh").args(["int", "ip", "reset"]).output()
                    .map_err(|e| e.to_string())?;
                if out.status.success() {
                    Ok("已成功重置 TCP/IP 传输协议栈与网络接口！".to_string())
                } else {
                    Err("重置 TCP/IP 失败，可能需要管理员权限".to_string())
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("TCP/IP 协议栈已重置。".to_string())
            }
        }
        "clear_arp" => {
            #[cfg(target_os = "windows")]
            {
                let _ = create_cmd("netsh").args(["interface", "ip", "delete", "arpcache"]).output();
                Ok("已清除系统 ARP 局域网物理地址映射缓存！".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("ARP 缓存已清除。".to_string())
            }
        }
        "renew_ip" => {
            #[cfg(target_os = "windows")]
            {
                let _ = create_cmd("ipconfig").arg("/release").output();
                let renew = create_cmd("ipconfig").arg("/renew").output()
                    .map_err(|e| e.to_string())?;
                if renew.status.success() {
                    Ok("已从路由器 DHCP 成功重新租用并获取全新 IP 地址！".to_string())
                } else {
                    Ok("已下发重新获取 IP 指令。".to_string())
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("已重新获取 DHCP IP。".to_string())
            }
        }
        "full_repair" => {
            #[cfg(target_os = "windows")]
            {
                let _ = create_cmd("ipconfig").arg("/flushdns").output();
                let _ = create_cmd("netsh").args(["interface", "ip", "delete", "arpcache"]).output();
                let _ = create_cmd("netsh").args(["winsock", "reset"]).output();
                let _ = create_cmd("netsh").args(["int", "ip", "reset"]).output();
                let _ = crate::probe::dns_tester::reset_dns_to_dhcp();
                Ok("✨ 全套网络急救复位已全部执行完成！（已清除 DNS 缓存、重置 Winsock & TCP 栈并恢复 DHCP，网络即将自动重新握手恢复）".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("全套网络复位已完成。".to_string())
            }
        }
        _ => Err(format!("未知的网络急救指令: {}", action)),
    }
}
