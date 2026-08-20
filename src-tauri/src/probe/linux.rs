use crate::models::GarbageScanResult;
use std::process::Command;

/// Linux 下刷新 DNS
#[allow(dead_code)]
pub fn flush_dns() -> Result<String, String> {
    let output = Command::new("systemd-resolve")
        .arg("--flush-caches")
        .output()
        .or_else(|_| Command::new("resolvectl").arg("flush-caches").output())
        .map_err(|e| format!("执行 systemd-resolve/resolvectl 失败: {}", e))?;

    if output.status.success() {
        Ok("Linux DNS 缓存已成功刷新。".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Linux 下扫描 /tmp 与 package 缓存
#[allow(dead_code)]
pub fn scan_garbage() -> GarbageScanResult {
    GarbageScanResult {
        total_bytes: 0,
        total_formatted: "0 MB".to_string(),
        items: Vec::new(),
    }
}

#[allow(dead_code)]
pub fn clean_garbage() -> Result<u64, String> {
    Ok(0)
}
