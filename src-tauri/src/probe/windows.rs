use crate::models::{GarbageItem, GarbageScanResult};
use std::fs;
use std::path::Path;
use std::process::Command;

/// 刷新 Windows 本地 DNS 解析缓存
pub fn flush_dns() -> Result<String, String> {
    let output = Command::new("ipconfig")
        .arg("/flushdns")
        .output()
        .map_err(|e| format!("执行 ipconfig /flushdns 失败: {}", e))?;

    if output.status.success() {
        Ok("已成功刷新系统 DNS 解析缓存 (Flush DNS)！".to_string())
    } else {
        Err("刷新 DNS 缓存失败，请确保具有系统管理员权限。".to_string())
    }
}


/// 扫描 Windows 临时垃圾文件与缓存
pub fn scan_garbage() -> GarbageScanResult {
    let mut items = Vec::new();
    let mut total_bytes = 0;

    // 1. 用户临时目录 (%TEMP%)
    if let Ok(temp_path) = std::env::var("TEMP") {
        let path_obj = Path::new(&temp_path);
        if path_obj.exists() {
            let size = calculate_dir_size(path_obj);
            total_bytes += size;
            items.push(GarbageItem {
                name: "用户临时文件 (User Temp)".to_string(),
                path: temp_path,
                size_bytes: size,
                size_formatted: format_bytes(size),
                description: "应用程序运行中生成的临时缓存与中间文件".to_string(),
            });
        }
    }

    // 2. Windows 系统临时目录 (C:\Windows\Temp)
    let win_temp = Path::new("C:\\Windows\\Temp");
    if win_temp.exists() {
        let size = calculate_dir_size(win_temp);
        total_bytes += size;
        items.push(GarbageItem {
            name: "系统临时缓存 (Windows Temp)".to_string(),
            path: win_temp.to_string_lossy().to_string(),
            size_bytes: size,
            size_formatted: format_bytes(size),
            description: "Windows 安装更新与系统组件产生的遗留临时缓存".to_string(),
        });
    }

    GarbageScanResult {
        total_bytes,
        total_formatted: format_bytes(total_bytes),
        items,
    }
}

/// 安全清理指定的临时文件目录 (跳过被锁定的活跃文件)
pub fn clean_garbage() -> Result<u64, String> {
    let mut freed_bytes = 0;

    if let Ok(temp_path) = std::env::var("TEMP") {
        freed_bytes += safe_clean_dir(Path::new(&temp_path));
    }

    Ok(freed_bytes)
}

fn calculate_dir_size(path: &Path) -> u64 {
    let mut size = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    size += metadata.len();
                } else if metadata.is_dir() {
                    size += calculate_dir_size(&entry.path());
                }
            }
        }
    }
    size
}

fn safe_clean_dir(path: &Path) -> u64 {
    let mut freed = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let len = meta.len();
                    if fs::remove_file(&p).is_ok() {
                        freed += len;
                    }
                } else if meta.is_dir() {
                    freed += safe_clean_dir(&p);
                    let _ = fs::remove_dir(&p);
                }
            }
        }
    }
    freed
}

fn format_bytes(bytes: u64) -> String {
    let mb = bytes as f64 / (1024.0 * 1024.0);
    if mb > 1024.0 {
        format!("{:.2} GB", mb / 1024.0)
    } else {
        format!("{:.1} MB", mb)
    }
}
