use crate::models::{GarbageScanResult, ProcessItem, SystemMetrics};
use crate::probe::ProbeState;
use tauri::State;

#[tauri::command]
pub async fn get_system_metrics(state: State<'_, ProbeState>) -> Result<SystemMetrics, String> {
    Ok(crate::probe::common::collect_system_metrics(&state))
}

#[tauri::command]
pub async fn get_process_list(
    state: State<'_, ProbeState>,
    limit: Option<usize>,
) -> Result<Vec<ProcessItem>, String> {
    let lim = limit.unwrap_or(30);
    Ok(crate::probe::common::collect_process_list(&state, lim))
}

#[tauri::command]
pub async fn kill_process(state: State<'_, ProbeState>, pid: u32) -> Result<bool, String> {
    crate::probe::common::safe_kill_process(&state, pid)
}

#[tauri::command]
pub async fn batch_kill_processes(state: State<'_, ProbeState>, pids: Vec<u32>) -> Result<usize, String> {
    crate::probe::common::batch_kill_processes(&state, pids)
}


#[tauri::command]
pub async fn scan_system_garbage() -> Result<GarbageScanResult, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(crate::probe::windows::scan_garbage())
    }

    #[cfg(target_os = "macos")]
    {
        Ok(crate::probe::macos::scan_garbage())
    }

    #[cfg(target_os = "linux")]
    {
        Ok(crate::probe::linux::scan_garbage())
    }
}

#[tauri::command]
pub async fn clean_system_garbage() -> Result<u64, String> {
    #[cfg(target_os = "windows")]
    {
        crate::probe::windows::clean_garbage()
    }

    #[cfg(target_os = "macos")]
    {
        crate::probe::macos::clean_garbage()
    }

    #[cfg(target_os = "linux")]
    {
        crate::probe::linux::clean_garbage()
    }
}

#[tauri::command]
pub async fn flush_dns_cache() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        crate::probe::windows::flush_dns()
    }

    #[cfg(target_os = "macos")]
    {
        crate::probe::macos::flush_dns()
    }

    #[cfg(target_os = "linux")]
    {
        crate::probe::linux::flush_dns()
    }
}

#[tauri::command]
pub async fn app_minimize(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn app_toggle_maximize(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn app_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_port_occupancy(port: u16, state: State<'_, ProbeState>) -> Result<crate::models::PortOccupantInfo, String> {
    Ok(crate::probe::port::check_port(port, &state))
}

#[tauri::command]
pub async fn scan_listening_ports(state: State<'_, ProbeState>) -> Result<Vec<crate::models::PortOccupantInfo>, String> {
    Ok(crate::probe::port::scan_active_ports(&state))
}


#[tauri::command]
pub async fn get_autostart_entries() -> Result<Vec<crate::models::AutostartEntry>, String> {
    Ok(crate::probe::autostart::get_autostart_entries())
}

#[tauri::command]
pub async fn toggle_autostart(name: String, enable: bool) -> Result<(), String> {
    crate::probe::autostart::toggle_autostart_entry(&name, enable)
}

#[tauri::command]
pub async fn test_dns_latency() -> Result<Vec<crate::models::DnsPingResult>, String> {
    Ok(crate::probe::dns_tester::test_dns_servers())
}

#[tauri::command]
pub async fn set_system_dns(primary: String, secondary: String) -> Result<String, String> {
    crate::probe::dns_tester::apply_dns_server(&primary, &secondary)
}

#[tauri::command]
pub async fn reset_dns_to_dhcp() -> Result<String, String> {
    crate::probe::dns_tester::reset_dns_to_dhcp()
}

#[tauri::command]
pub async fn scan_large_files(
    target_dir: Option<String>,
    min_size_mb: Option<u64>,
    limit: Option<usize>,
) -> Result<Vec<crate::models::LargeFileInfo>, String> {
    let dir = target_dir.unwrap_or_default();
    let min_size = min_size_mb.unwrap_or(500);
    let lim = limit.unwrap_or(50);
    Ok(crate::probe::disk_radar::scan_large_files_in_dir(&dir, min_size, lim))
}

#[tauri::command]
pub async fn locate_file(path: String) -> Result<(), String> {
    crate::probe::disk_radar::locate_file_in_explorer(&path)
}

#[tauri::command]
pub async fn delete_large_file(path: String) -> Result<(), String> {
    crate::probe::disk_radar::delete_large_file(&path)
}

#[tauri::command]
pub async fn scan_docker_environment() -> Result<crate::models::DockerOverview, String> {
    Ok(crate::probe::docker::scan_docker_environment())
}

#[tauri::command]
pub async fn prune_docker_target(target: String) -> Result<String, String> {
    crate::probe::docker::prune_docker_target(&target)
}

#[tauri::command]
pub async fn diagnose_network_health() -> Result<crate::models::NetworkDiagnosisResult, String> {
    Ok(crate::probe::network_repair::diagnose_network_health())
}

#[tauri::command]
pub async fn execute_network_repair(action: String) -> Result<String, String> {
    crate::probe::network_repair::execute_network_repair(&action)
}

#[tauri::command]
pub async fn save_diagnostic_report(title: String, content: String) -> Result<String, String> {
    crate::probe::disk_radar::save_diagnostic_report_file(&title, &content)
}

#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

// -------------------------------------------------------------
// GGUF Local Model Hub Commands
// -------------------------------------------------------------

#[tauri::command]
pub async fn get_model_catalog(
    state: tauri::State<'_, crate::model_manager::ModelManagerState>,
) -> Result<Vec<crate::model_manager::ModelItem>, String> {
    Ok(crate::model_manager::list_models(&state).await)
}

#[tauri::command]
pub async fn download_local_model(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::model_manager::ModelManagerState>,
    model_id: String,
) -> Result<String, String> {
    crate::model_manager::download_model(app, &state, model_id).await
}

#[tauri::command]
pub async fn cancel_model_download(
    state: tauri::State<'_, crate::model_manager::ModelManagerState>,
    model_id: String,
) -> Result<String, String> {
    crate::model_manager::cancel_download(&state, model_id).await
}

#[tauri::command]
pub async fn delete_local_model(
    state: tauri::State<'_, crate::model_manager::ModelManagerState>,
    model_id: String,
) -> Result<String, String> {
    crate::model_manager::delete_model(&state, model_id).await
}

#[tauri::command]
pub async fn set_active_local_model(
    state: tauri::State<'_, crate::model_manager::ModelManagerState>,
    model_id: String,
) -> Result<String, String> {
    crate::model_manager::set_active_model(&state, model_id).await
}

#[tauri::command]
pub fn open_models_folder() -> Result<String, String> {
    crate::model_manager::open_models_folder()
}









