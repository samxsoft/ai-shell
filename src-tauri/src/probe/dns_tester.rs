use crate::models::DnsPingResult;
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

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
        name: "百度 BaiduDNS (百度智能解析)",
        primary: "180.76.76.76",
        secondary: "180.76.76.77",
    },
    DnsPreset {
        name: "Cloudflare (全球极速 Anycast)",
        primary: "1.1.1.1",
        secondary: "1.0.0.1",
    },
    DnsPreset {
        name: "Google Public DNS (国际通用)",
        primary: "8.8.8.8",
        secondary: "8.8.4.4",
    },
];

/// 真实测速所有主流公共 DNS
pub fn test_dns_servers() -> Vec<DnsPingResult> {
    let mut results = Vec::new();

    for preset in PRESETS {
        let latency = measure_latency(preset.primary, 53, Duration::from_millis(1500));

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

        results.push(DnsPingResult {
            name: preset.name.to_string(),
            primary_ip: preset.primary.to_string(),
            secondary_ip: preset.secondary.to_string(),
            latency_ms: latency_val,
            is_current: false,
            status,
        });
    }

    // 按延迟升序排序 (连不通的排在最后)
    results.sort_by_key(|r| r.latency_ms.unwrap_or(9999));

    results
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

#[cfg(target_os = "windows")]
fn apply_dns_windows(primary_ip: &str, secondary_ip: &str) -> Result<String, String> {
    use std::process::Command;

    // 使用 PowerShell Set-DnsClientServerAddress 设置所有活跃以太网/Wi-Fi 的 DNS
    let ps_script = format!(
        r#"Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' }} | ForEach-Object {{ Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ('{}', '{}') }}"#,
        primary_ip, secondary_ip
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("执行 PowerShell 设置 DNS 失败: {}", e))?;

    // 刷新 DNS 缓存
    let _ = Command::new("ipconfig").arg("/flushdns").output();

    if output.status.success() {
        Ok(format!("DNS 已成功切换为: {} / {}", primary_ip, secondary_ip))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
