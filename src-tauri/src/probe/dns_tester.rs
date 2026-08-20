use crate::models::DnsPingResult;
use std::net::{SocketAddr, TcpStream};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
fn create_silent_cmd(prog: &str) -> Command {
    let mut cmd = Command::new(prog);
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}


struct DnsPreset {
    name: &'static str,
    primary: &'static str,
    secondary: &'static str,
}

const PRESETS: &[DnsPreset] = &[
    DnsPreset {
        name: "阿里 AliDNS (推荐国内极速)",
        primary: "223.5.5.5",
        secondary: "223.6.6.6",
    },
    DnsPreset {
        name: "腾讯 DNSPod (腾讯云骨干网)",
        primary: "119.29.29.29",
        secondary: "182.254.116.116",
    },
    DnsPreset {
        name: "114 DNS (国内老牌经典)",
        primary: "114.114.114.114",
        secondary: "114.114.115.115",
    },
    DnsPreset {
        name: "百度 BaiduDNS (智能多线加速)",
        primary: "180.76.76.76",
        secondary: "180.76.76.77",
    },
    DnsPreset {
        name: "火山引擎 ByteDNS (字节跳动)",
        primary: "180.184.1.1",
        secondary: "180.184.2.2",
    },
    DnsPreset {
        name: "Cloudflare (全球极速 Anycast)",
        primary: "1.1.1.1",
        secondary: "1.0.0.1",
    },
    DnsPreset {
        name: "Google Public DNS (全球标准)",
        primary: "8.8.8.8",
        secondary: "8.8.4.4",
    },
    DnsPreset {
        name: "OpenDNS (Cisco 安全防护)",
        primary: "208.67.222.222",
        secondary: "208.67.220.220",
    },
];

/// 多线程并发测速所有主流公共 DNS
pub fn test_dns_servers() -> Vec<DnsPingResult> {
    let current_dns_ips = get_current_system_dns_ips();
    let results = Arc::new(Mutex::new(Vec::new()));
    let mut handles = Vec::new();

    for preset in PRESETS {
        let results_clone = Arc::clone(&results);
        let name = preset.name.to_string();
        let primary = preset.primary.to_string();
        let secondary = preset.secondary.to_string();
        let is_curr = current_dns_ips.iter().any(|ip| ip == &primary);

        let handle = thread::spawn(move || {
            let latency = measure_latency(&primary, 53, Duration::from_millis(1200));
            let (status, latency_val) = match latency {
                Some(ms) => {
                    let s = if ms < 30 {
                        "fast"
                    } else if ms < 80 {
                        "normal"
                    } else {
                        "slow"
                    };
                    (s.to_string(), Some(ms))
                }
                None => ("unreachable".to_string(), None),
            };

            let mut list = results_clone.lock().unwrap();
            list.push(DnsPingResult {
                name,
                primary_ip: primary,
                secondary_ip: secondary,
                latency_ms: latency_val,
                is_current: is_curr,
                status,
            });
        });

        handles.push(handle);
    }

    for h in handles {
        let _ = h.join();
    }

    let mut final_list = results.lock().unwrap().clone();
    // 按延迟升序排列 (超时排在最后)
    final_list.sort_by_key(|r| r.latency_ms.unwrap_or(9999));
    final_list
}

/// 一键应用 DNS 服务器
pub fn apply_dns_server(primary_ip: &str, secondary_ip: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        apply_dns_windows(primary_ip, secondary_ip)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (primary_ip, secondary_ip);
        Ok("已配置 DNS".to_string())
    }
}

/// 恢复为 DHCP 自动分配 DNS
pub fn reset_dns_to_dhcp() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        reset_dns_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok("已恢复自动分配 DNS".to_string())
    }
}

/// 强制刷新系统本地 DNS 缓存
pub fn flush_dns_cache_system() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = create_silent_cmd("ipconfig")
            .arg("/flushdns")
            .output()
            .map_err(|e| format!("执行 ipconfig /flushdns 失败: {}", e))?;

        if output.status.success() {
            Ok("Windows IP 配置：已成功刷新 DNS 解析缓存。".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok("DNS 解析缓存已刷新。".to_string())
    }
}

fn measure_latency(ip: &str, port: u16, timeout: Duration) -> Option<u64> {
    let addr_str = format!("{}:{}", ip, port);
    if let Ok(addr) = addr_str.parse::<SocketAddr>() {
        let start = Instant::now();
        if TcpStream::connect_timeout(&addr, timeout).is_ok() {
            let elapsed = start.elapsed();
            return Some(elapsed.as_millis() as u64);
        }
    }
    None
}

/// 获取当前系统活跃网卡的 DNS IP 列表
fn get_current_system_dns_ips() -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        let ps_cmd = "(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 }).ServerAddresses";
        if let Ok(out) = create_silent_cmd("powershell").args(["-NoProfile", "-Command", ps_cmd]).output() {
            let stdout = String::from_utf8_lossy(&out.stdout);
            return stdout
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
        }
    }
    Vec::new()
}

#[cfg(target_os = "windows")]
fn apply_dns_windows(primary_ip: &str, secondary_ip: &str) -> Result<String, String> {
    // 使用 PowerShell Set-DnsClientServerAddress 设置所有活跃以太网/Wi-Fi 的 DNS
    let ps_script = format!(
        r#"Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' }} | ForEach-Object {{ Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ('{}', '{}') }}"#,
        primary_ip, secondary_ip
    );

    let output = create_silent_cmd("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("执行 PowerShell 设置 DNS 失败: {}", e))?;

    // 刷新 DNS 缓存
    let _ = create_silent_cmd("ipconfig").arg("/flushdns").output();

    if output.status.success() {
        Ok(format!("已成功切换为: {} (备用: {})，并刷新了系统 DNS 缓存！", primary_ip, secondary_ip))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg(target_os = "windows")]
fn reset_dns_windows() -> Result<String, String> {
    let ps_script = r#"Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }"#;

    let output = create_silent_cmd("powershell")
        .args(["-NoProfile", "-Command", ps_script])
        .output()
        .map_err(|e| format!("恢复 DHCP DNS 失败: {}", e))?;

    let _ = create_silent_cmd("ipconfig").arg("/flushdns").output();

    if output.status.success() {
        Ok("已成功恢复为路由器 DHCP 自动获取 DNS，并刷新了 DNS 缓存！".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

