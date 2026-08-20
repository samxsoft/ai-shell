use crate::models::GarbageScanResult;
use std::process::Command;

/// macOS 下刷新 DNS
#[allow(dead_code)]
pub fn flush_dns() -> Result<String, String> {
    let output = Command::new("dscacheutil")
        .arg("-flushcache")
        .output()
        .map_err(|e| format!("执行 dscacheutil 失败: {}", e))?;

    if output.status.success() {
        Ok("macOS DNS 缓存已成功刷新。".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// macOS 下扫描 ~/Library/Caches
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
