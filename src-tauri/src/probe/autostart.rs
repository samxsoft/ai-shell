use crate::models::AutostartEntry;

#[cfg(target_os = "windows")]
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE};
#[cfg(target_os = "windows")]
use winreg::RegKey;

/// 获取当前系统的开机自启动项列表
pub fn get_autostart_entries() -> Vec<AutostartEntry> {
    #[cfg(target_os = "windows")]
    {
        get_autostart_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        get_autostart_unix()
    }
}

/// 切换自启动项启用/禁用状态
pub fn toggle_autostart_entry(name: &str, enable: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        toggle_autostart_windows(name, enable)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (name, enable);
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn get_autostart_windows() -> Vec<AutostartEntry> {
    let mut entries = Vec::new();

    // 1. 读取 HKCU Run (当前用户活跃自启)
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_READ,
    ) {
        for (name, val) in run_key.enum_values().flatten() {
            let command: String = val.to_string();
            let (publisher, impact, safe) = analyze_autostart_safety(&name, &command);
            entries.push(AutostartEntry {
                name,
                command,
                location: "HKCU (当前用户注册表)".to_string(),
                enabled: true,
                description: Some("用户登录时自动启动".to_string()),
                publisher: Some(publisher),
                impact: Some(impact),
                safe_to_disable: Some(safe),
            });
        }
    }

    // 2. 读取 HKCU Run-Disabled (通过本软件已禁用的自启项)
    if let Ok(disabled_key) = hkcu.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled",
        KEY_READ,
    ) {
        for (name, val) in disabled_key.enum_values().flatten() {
            let command: String = val.to_string();
            let (publisher, impact, safe) = analyze_autostart_safety(&name, &command);
            entries.push(AutostartEntry {
                name,
                command,
                location: "HKCU (当前用户注册表)".to_string(),
                enabled: false,
                description: Some("已禁用 (可通过本工具随时恢复)".to_string()),
                publisher: Some(publisher),
                impact: Some(impact),
                safe_to_disable: Some(safe),
            });
        }
    }

    // 3. 读取 HKLM Run (系统全局自启项)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(run_key) = hklm.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_READ,
    ) {
        for (name, val) in run_key.enum_values().flatten() {
            let command: String = val.to_string();
            let (publisher, impact, safe) = analyze_autostart_safety(&name, &command);
            entries.push(AutostartEntry {
                name,
                command,
                location: "HKLM (全局系统注册表)".to_string(),
                enabled: true,
                description: Some("开机对所有用户生效".to_string()),
                publisher: Some(publisher),
                impact: Some(impact),
                safe_to_disable: Some(safe),
            });
        }
    }

    // 4. 读取 HKLM 32位系统自启 (WOW6432Node)
    if let Ok(run_key) = hklm.open_subkey_with_flags(
        "Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_READ,
    ) {
        for (name, val) in run_key.enum_values().flatten() {
            let command: String = val.to_string();
            let (publisher, impact, safe) = analyze_autostart_safety(&name, &command);
            // 避免重复
            if !entries.iter().any(|e| e.name == name) {
                entries.push(AutostartEntry {
                    name,
                    command,
                    location: "HKLM 32-bit (32位兼容注册表)".to_string(),
                    enabled: true,
                    description: Some("32位应用程序自启".to_string()),
                    publisher: Some(publisher),
                    impact: Some(impact),
                    safe_to_disable: Some(safe),
                });
            }
        }
    }

    // 5. 读取用户 Startup 文件夹快捷方式
    if let Ok(appdata) = std::env::var("APPDATA") {
        let startup_dir = std::path::PathBuf::from(appdata)
            .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
        if let Ok(dir_entries) = std::fs::read_dir(startup_dir) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                    let is_disabled = path.extension().map_or(false, |ext| ext == "disabled");
                    let (publisher, impact, safe) = analyze_autostart_safety(&file_name, &path.to_string_lossy());
                    entries.push(AutostartEntry {
                        name: file_name,
                        command: path.to_string_lossy().to_string(),
                        location: "StartupFolder (启动目录)".to_string(),
                        enabled: !is_disabled,
                        description: Some("启动文件夹快捷方式".to_string()),
                        publisher: Some(publisher),
                        impact: Some(impact),
                        safe_to_disable: Some(safe),
                    });
                }
            }
        }
    }

    entries
}

/// 智能分析自启项的发行商、开机耗时影响及安全禁用建议
fn analyze_autostart_safety(name: &str, cmd: &str) -> (String, String, bool) {
    let lower_name = name.to_lowercase();
    let lower_cmd = cmd.to_lowercase();

    // 驱动与系统级核心守护（不建议禁用）
    if lower_name.contains("realtek") || lower_name.contains("audio") || lower_name.contains("sound") {
        return ("Realtek / Audio Driver".to_string(), "low".to_string(), false);
    }
    if lower_name.contains("nvidia") || lower_name.contains("nv") || lower_cmd.contains("nvidia") {
        return ("NVIDIA Corporation".to_string(), "medium".to_string(), false);
    }
    if lower_name.contains("intel") || lower_cmd.contains("intel") {
        return ("Intel Corporation".to_string(), "low".to_string(), false);
    }
    if lower_name.contains("windows defender") || lower_name.contains("securityhealth") {
        return ("Microsoft Windows Security".to_string(), "high".to_string(), false);
    }

    // 常见第三方应用（建议按需安全禁用，大幅提速开机）
    if lower_name.contains("steam") || lower_cmd.contains("steam.exe") {
        return ("Valve Steam".to_string(), "high".to_string(), true);
    }
    if lower_name.contains("epic") || lower_cmd.contains("epicgames") {
        return ("Epic Games".to_string(), "high".to_string(), true);
    }
    if lower_name.contains("wechat") || lower_name.contains("weixin") || lower_cmd.contains("wechat") {
        return ("Tencent WeChat".to_string(), "medium".to_string(), true);
    }
    if lower_name.contains("qq") || lower_cmd.contains("qq.exe") {
        return ("Tencent QQ".to_string(), "medium".to_string(), true);
    }
    if lower_name.contains("spotify") || lower_cmd.contains("spotify") {
        return ("Spotify AB".to_string(), "high".to_string(), true);
    }
    if lower_name.contains("discord") || lower_cmd.contains("discord") {
        return ("Discord Inc.".to_string(), "high".to_string(), true);
    }
    if lower_name.contains("onedrive") || lower_cmd.contains("onedrive") {
        return ("Microsoft OneDrive".to_string(), "medium".to_string(), true);
    }
    if lower_name.contains("baidunetdisk") || lower_cmd.contains("baidunetdisk") {
        return ("Baidu Netdisk (百度网盘)".to_string(), "high".to_string(), true);
    }
    if lower_name.contains("update") || lower_name.contains("helper") || lower_name.contains("assistant") {
        return ("Third-Party Updater".to_string(), "medium".to_string(), true);
    }

    ("第三方应用程序".to_string(), "medium".to_string(), true)
}

#[cfg(target_os = "windows")]
fn toggle_autostart_windows(name: &str, enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let disabled_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled";

    if enable {
        // 从 Run-Disabled 移回 Run
        if let Ok(disabled_key) = hkcu.open_subkey_with_flags(disabled_path, KEY_READ | KEY_WRITE) {
            if let Ok(val) = disabled_key.get_value::<String, _>(name) {
                let (run_key, _) = hkcu.create_subkey(run_path).map_err(|e| e.to_string())?;
                run_key.set_value(name, &val).map_err(|e| e.to_string())?;
                let _ = disabled_key.delete_value(name);
                return Ok(());
            }
        }
    } else {
        // 从 Run 移到 Run-Disabled
        if let Ok(run_key) = hkcu.open_subkey_with_flags(run_path, KEY_READ | KEY_WRITE) {
            if let Ok(val) = run_key.get_value::<String, _>(name) {
                let (disabled_key, _) = hkcu.create_subkey(disabled_path).map_err(|e| e.to_string())?;
                disabled_key.set_value(name, &val).map_err(|e| e.to_string())?;
                let _ = run_key.delete_value(name);
                return Ok(());
            }
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn get_autostart_unix() -> Vec<AutostartEntry> {
    Vec::new()
}
