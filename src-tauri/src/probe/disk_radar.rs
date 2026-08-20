use crate::models::LargeFileInfo;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::UNIX_EPOCH;

/// 扫描指定目录下的所有大文件
pub fn scan_large_files_in_dir(target_dir: &str, min_size_mb: u64, limit: usize) -> Vec<LargeFileInfo> {
    let min_bytes = min_size_mb * 1024 * 1024;
    let mut files = Vec::new();

    let root_path = if target_dir.trim().is_empty() || target_dir == "default" {
        // 默认扫描用户主目录 (极速且最常见)
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            user_profile
        } else if let Ok(home) = std::env::var("HOME") {
            home
        } else {
            "C:\\".to_string()
        }
    } else {
        target_dir.to_string()
    };

    let path_obj = Path::new(&root_path);
    if path_obj.exists() {
        // 最大递归深度限制为 8 层，避免死循环或进入无尽软链接
        walk_dir_for_large_files(path_obj, min_bytes, 0, 8, &mut files);
    }

    // 按文件体积从大到小降序排列
    files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    files.truncate(limit);
    files
}

/// 在操作系统的资源管理器中直接定位并选中该文件
pub fn locate_file_in_explorer(file_path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", file_path])
            .spawn()
            .map_err(|e| format!("无法打开资源管理器: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", file_path])
            .spawn()
            .map_err(|e| format!("无法打开 Finder: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = Path::new(file_path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("无法打开文件管理器: {}", e))?;
        }
        Ok(())
    }
}

/// 删除指定的大文件
pub fn delete_large_file(file_path: &str) -> Result<(), String> {
    let p = Path::new(file_path);
    if !p.exists() {
        return Err("文件不存在".to_string());
    }

    if p.is_file() {
        fs::remove_file(p).map_err(|e| format!("删除文件失败: {}", e))?;
        Ok(())
    } else if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("删除目录失败: {}", e))?;
        Ok(())
    } else {
        Err("无效的文件类型".to_string())
    }
}

fn walk_dir_for_large_files(
    dir: &Path,
    min_bytes: u64,
    current_depth: usize,
    max_depth: usize,
    results: &mut Vec<LargeFileInfo>,
) {
    if current_depth > max_depth {
        return;
    }

    // 忽略无需遍历的系统目录以极大提高扫描速度
    let dir_name = dir.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
    if dir_name.starts_with('$') || dir_name == "system volume information" || dir_name == "windows" {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let len = meta.len();
                    if len >= min_bytes {
                        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let file_type = classify_file_type(&file_name);
                        let modified_time = meta
                            .modified()
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| {
                                let secs = d.as_secs();
                                // 简易时间格式化
                                let hours = (secs / 3600) % 24;
                                let days = secs / 86400;
                                let year = 1970 + days / 365;
                                let month = ((days % 365) / 30) + 1;
                                let day = (days % 30) + 1;
                                format!("{:04}-{:02}-{:02} {:02}:00", year, month, day, hours)
                            })
                            .unwrap_or_else(|| "未知日期".to_string());

                        results.push(LargeFileInfo {
                            path: path.to_string_lossy().to_string(),
                            file_name,
                            size_bytes: len,
                            size_formatted: format_bytes(len),
                            file_type,
                            modified_time,
                        });
                    }
                } else if meta.is_dir() {
                    walk_dir_for_large_files(&path, min_bytes, current_depth + 1, max_depth, results);
                }
            }
        }
    }
}

fn classify_file_type(name: &str) -> String {
    let lower = name.to_lowercase();

    if lower.ends_with(".vhdx") || lower.ends_with(".vmdk") || lower.ends_with(".iso") || lower.ends_with(".qcow2") || lower.ends_with(".img") || lower.ends_with(".vdi") {
        "virtual_disk".to_string()
    } else if lower.ends_with(".zip") || lower.ends_with(".rar") || lower.ends_with(".7z") || lower.ends_with(".tar") || lower.ends_with(".gz") || lower.ends_with(".bz2") {
        "archive".to_string()
    } else if lower.ends_with(".mp4") || lower.ends_with(".mkv") || lower.ends_with(".mov") || lower.ends_with(".avi") || lower.ends_with(".flv") || lower.ends_with(".wmv") {
        "media".to_string()
    } else if lower.ends_with(".exe") || lower.ends_with(".msi") || lower.ends_with(".dmg") || lower.ends_with(".pkg") || lower.ends_with(".deb") {
        "installer".to_string()
    } else if lower.ends_with(".mdf") || lower.ends_with(".ldf") || lower.ends_with(".ibdata1") || lower.ends_with(".sql") || lower.ends_with(".dump") || lower.ends_with(".db") {
        "database".to_string()
    } else {
        "other".to_string()
    }
}

fn format_bytes(bytes: u64) -> String {
    let mb = bytes as f64 / (1024.0 * 1024.0);
    if mb > 1024.0 {
        format!("{:.2} GB", mb / 1024.0)
    } else {
        format!("{:.1} MB", mb)
    }
}

/// 将排障报告保存为本地 Markdown 文件并自动在资源管理器中定位
pub fn save_diagnostic_report_file(title: &str, content: &str) -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let downloads_dir = std::path::Path::new(&home).join("Downloads");
    let target_dir = if downloads_dir.exists() {
        downloads_dir
    } else {
        let desktop_dir = std::path::Path::new(&home).join("Desktop");
        if desktop_dir.exists() {
            desktop_dir
        } else {
            std::path::PathBuf::from(&home)
        }
    };

    let sanitized_title: String = title
        .chars()
        .map(|c| if ['\\', '/', ':', '*', '?', '"', '<', '>', '|'].contains(&c) { '_' } else { c })
        .collect();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let filename = format!("AI-Shell-排障报告-{}-{}.md", sanitized_title, timestamp);
    let file_path = target_dir.join(filename);

    std::fs::write(&file_path, content.as_bytes())
        .map_err(|e| format!("保存报告文件失败: {}", e))?;

    let path_str = file_path.to_string_lossy().to_string();
    let _ = locate_file_in_explorer(&path_str);

    Ok(path_str)
}

