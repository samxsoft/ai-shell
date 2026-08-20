use crate::models::{GarbageItem, GarbageScanResult};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::os::windows::process::CommandExt;

/// 刷新 Windows 本地 DNS 解析缓存
pub fn flush_dns() -> Result<String, String> {
    let mut cmd = Command::new("ipconfig");
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let output = cmd
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

    let target_dirs = get_windows_garbage_targets();

    for (name, path_buf, desc) in target_dirs {
        if path_buf.exists() {
            let size = calculate_dir_size(&path_buf);
            if size > 0 {
                total_bytes += size;
                items.push(GarbageItem {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    size_bytes: size,
                    size_formatted: format_bytes(size),
                    description: desc,
                });
            }
        }
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
    let target_dirs = get_windows_garbage_targets();

    for (_name, path_buf, _desc) in target_dirs {
        if path_buf.exists() {
            freed_bytes += safe_clean_dir(&path_buf);
        }
    }

    Ok(freed_bytes)
}

fn get_windows_garbage_targets() -> Vec<(String, PathBuf, String)> {
    let mut targets = Vec::new();

    // 1. 用户临时目录 (%TEMP%)
    if let Ok(temp_path) = std::env::var("TEMP") {
        targets.push((
            "用户临时缓存 (User Temp)".to_string(),
            PathBuf::from(temp_path),
            "运行软件时解压的临时安装包与临时中间数据".to_string(),
        ));
    }

    // 2. Windows 系统临时目录 (C:\Windows\Temp)
    targets.push((
        "系统临时缓存 (Windows Temp)".to_string(),
        PathBuf::from("C:\\Windows\\Temp"),
        "Windows 系统组件与安装程序遗留的临时日志与缓存".to_string(),
    ));

    // 3. Windows Update 历史安装下载包 (SoftwareDistribution\Download)
    targets.push((
        "Windows Update 更新下载包".to_string(),
        PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"),
        "系统更新补丁下载完成后遗留的旧安装镜像，已安装完毕可安全清理".to_string(),
    ));

    // 4. 系统崩溃转储与错误日志 (Minidump)
    targets.push((
        "系统崩溃转储 (Minidump)".to_string(),
        PathBuf::from("C:\\Windows\\Minidump"),
        "系统蓝屏或崩溃时生成的内存转储文件".to_string(),
    ));

    // 5. 应用崩溃转储 (CrashDumps)
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        targets.push((
            "应用程序崩溃转储 (CrashDumps)".to_string(),
            PathBuf::from(&local_appdata).join("CrashDumps"),
            "第三方软件意外闪退时保存的诊断内存快照".to_string(),
        ));

        targets.push((
            "图片缩略图索引缓存 (Thumbnails)".to_string(),
            PathBuf::from(&local_appdata).join("Microsoft\\Windows\\Explorer"),
            "资源管理器生成的缩略图预览缓存数据库".to_string(),
        ));
    }

    // 6. Windows 日志文件 (Logs)
    targets.push((
        "Windows CBS 与系统日志".to_string(),
        PathBuf::from("C:\\Windows\\Logs\\CBS"),
        "Windows 组件维护与升级产生的历史日志文件".to_string(),
    ));

    targets
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
                    // 若文件被占用则安全跳过
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
