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

    // 1. 读取 HKCU (当前用户注册表启动项)
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_READ,
    ) {
        for (name, val) in run_key.enum_values().flatten() {
            let command: String = val.to_string();
            entries.push(AutostartEntry {
                name,
                command,
                location: "HKCU (当前用户注册表)".to_string(),
                enabled: true,
                description: Some("开机登录当前用户时自动启动".to_string()),
            });
        }
    }

    // 2. 读取 HKLM (所有用户/机器注册表启动项)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(run_key) = hklm.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_READ,
    ) {
        for (name, val) in run_key.enum_values().flatten() {
            let command: String = val.to_string();
            entries.push(AutostartEntry {
                name,
                command,
                location: "HKLM (全局系统注册表)".to_string(),
                enabled: true,
                description: Some("系统启动时对所有用户生效".to_string()),
            });
        }
    }

    // 3. 读取用户 Startup 文件夹快捷方式
    if let Ok(appdata) = std::env::var("APPDATA") {
        let startup_dir = std::path::PathBuf::from(appdata)
            .join("Microsoft\\Windows\\Start Menu\\Programs\\Startup");
        if let Ok(dir_entries) = std::fs::read_dir(startup_dir) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                    entries.push(AutostartEntry {
                        name: file_name,
                        command: path.to_string_lossy().to_string(),
                        location: "StartupFolder (启动文件夹)".to_string(),
                        enabled: true,
                        description: Some("启动目录快捷方式".to_string()),
                    });
                }
            }
        }
    }

    entries
}

#[cfg(target_os = "windows")]
fn toggle_autostart_windows(name: &str, enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let disabled_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run-Disabled";

    if enable {
        // 尝试从 Run-Disabled 移回 Run
        if let Ok(disabled_key) = hkcu.open_subkey_with_flags(disabled_path, KEY_READ | KEY_WRITE) {
            if let Ok(val) = disabled_key.get_value::<String, _>(name) {
                let (run_key, _) = hkcu.create_subkey(run_path).map_err(|e| e.to_string())?;
                run_key.set_value(name, &val).map_err(|e| e.to_string())?;
                let _ = disabled_key.delete_value(name);
                return Ok(());
            }
        }
    } else {
        // 尝试从 Run 移到 Run-Disabled
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
