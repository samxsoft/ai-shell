pub mod commands;
pub mod models;
pub mod probe;
pub mod tray;

use probe::ProbeState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProbeState::new())
        .setup(|app| {
            // 初始化系统托盘图标
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // 点击关闭按钮时拦截退出，最小化隐藏到系统托盘
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_metrics,
            commands::get_process_list,
            commands::kill_process,
            commands::scan_system_garbage,
            commands::clean_system_garbage,
            commands::flush_dns_cache,
            commands::app_minimize,
            commands::app_toggle_maximize,
            commands::app_close,
            commands::check_port_occupancy,
            commands::scan_listening_ports,
            commands::get_autostart_entries,

            commands::toggle_autostart,
            commands::test_dns_latency,
            commands::set_system_dns,
            commands::reset_dns_to_dhcp,
            commands::scan_large_files,
            commands::locate_file,
            commands::delete_large_file,
            commands::batch_kill_processes,
            commands::scan_docker_environment,
            commands::prune_docker_target,
            commands::diagnose_network_health,
            commands::execute_network_repair,
            commands::save_diagnostic_report,
        ])







        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
