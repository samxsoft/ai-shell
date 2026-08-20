use crate::models::{DiskPartition, ProcessItem, SystemMetrics};
use crate::probe::ProbeState;
use std::time::Instant;
use sysinfo::{Disks, Pid, ProcessesToUpdate, System};

/// 跨平台受保护的关键核心系统进程名称（禁止普通结束）
const PROTECTED_SYSTEM_PROCESSES: &[&str] = &[
    "system", "system idle process", "smss.exe", "csrss.exe", "wininit.exe",
    "services.exe", "lsass.exe", "winlogon.exe", "svchost.exe", "explorer.exe",
    "init", "systemd", "kthreadd", "launchd", "kernel_task", "windowserver"
];

/// 采集全局系统性能指标 (CPU, 内存, 磁盘, 实时网络)
pub fn collect_system_metrics(state: &ProbeState) -> SystemMetrics {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_cpu_all();
    sys.refresh_memory();

    // 1. CPU 占用率与核心数
    let cpu_usage = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();
    let physical_cores = sys.physical_core_count().unwrap_or(cpu_cores);


    // 2. 真实物理内存 (Bytes -> GB)
    let total_mem_bytes = sys.total_memory();
    let used_mem_bytes = sys.used_memory();
    let memory_total_gb = total_mem_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let memory_used_gb = used_mem_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let memory_usage_percent = if total_mem_bytes > 0 {
        (used_mem_bytes as f64 / total_mem_bytes as f64) * 100.0
    } else {
        0.0
    };

    // 3. 磁盘精准识别
    let disks = Disks::new_with_refreshed_list();
    let mut disk_partitions = Vec::new();

    // 判定系统盘特征
    #[cfg(target_os = "windows")]
    let sys_drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string()).to_uppercase();

    let mut primary_idx = 0;
    let mut max_space = 0.0;

    for (idx, disk) in disks.iter().enumerate() {
        let total = disk.total_space() as f64 / (1024.0 * 1024.0 * 1024.0);
        let available = disk.available_space() as f64 / (1024.0 * 1024.0 * 1024.0);
        let used = (total - available).max(0.0);
        let usage_pct = if total > 0.0 { (used / total) * 100.0 } else { 0.0 };

        let mount = disk.mount_point().to_string_lossy().to_string();
        let name = disk.name().to_string_lossy().to_string();
        let fs = disk.file_system().to_string_lossy().to_string();

        let is_system_disk = {
            #[cfg(target_os = "windows")]
            {
                mount.to_uppercase().starts_with(&sys_drive) || mount.to_uppercase().starts_with("C:")
            }
            #[cfg(not(target_os = "windows"))]
            {
                mount == "/"
            }
        };

        if is_system_disk {
            primary_idx = idx;
        } else if total > max_space && primary_idx == 0 && !is_system_disk {
            max_space = total;
        }

        disk_partitions.push(DiskPartition {
            mount_point: mount.clone(),
            name: if name.is_empty() { mount } else { name },
            total_gb: (total * 10.0).round() / 10.0,
            available_gb: (available * 10.0).round() / 10.0,
            used_gb: (used * 10.0).round() / 10.0,
            usage_percent: (usage_pct * 10.0).round() / 10.0,
            file_system: fs,
            is_system_disk,
        });
    }

    let (primary_disk_name, primary_disk_total_gb, primary_disk_used_gb, primary_disk_usage_percent) = 
        if !disk_partitions.is_empty() && primary_idx < disk_partitions.len() {
            let p = &disk_partitions[primary_idx];
            (format!("系统盘 ({})", p.mount_point), p.total_gb, p.used_gb, p.usage_percent)
        } else {
            ("系统盘 (C:)".to_string(), 512.0, 256.0, 50.0)
        };


    // 4. 实时网络吞吐 (KB/s)
    let mut networks = state.networks.lock().unwrap();
    networks.refresh(true);
    let mut now_rx_bytes = 0;
    let mut now_tx_bytes = 0;
    for (_name, net) in networks.iter() {
        now_rx_bytes += net.total_received();
        now_tx_bytes += net.total_transmitted();
    }

    let mut last_check = state.last_network_check.lock().unwrap();
    let mut last_rx = state.last_rx_bytes.lock().unwrap();
    let mut last_tx = state.last_tx_bytes.lock().unwrap();

    let duration_secs = now_duration_secs(&last_check);
    let rx_rate = if duration_secs > 0.0 && now_rx_bytes >= *last_rx {
        ((now_rx_bytes - *last_rx) as f64 / duration_secs / 1024.0) as u64
    } else {
        0
    };
    let tx_rate = if duration_secs > 0.0 && now_tx_bytes >= *last_tx {
        ((now_tx_bytes - *last_tx) as f64 / duration_secs / 1024.0) as u64
    } else {
        0
    };

    *last_check = Instant::now();
    *last_rx = now_rx_bytes;
    *last_tx = now_tx_bytes;

    // 5. 运行时间与进程数
    let uptime_hours = System::uptime() as f64 / 3600.0;
    let process_count = sys.processes().len();

    // 6. 综合健康评分 (0 - 100)
    let mut penalty = 0;
    if cpu_usage > 80.0 {
        penalty += 25;
    } else if cpu_usage > 50.0 {
        penalty += 10;
    }

    if memory_usage_percent > 85.0 {
        penalty += 25;
    } else if memory_usage_percent > 70.0 {
        penalty += 10;
    }

    if primary_disk_usage_percent > 90.0 {
        penalty += 25;
    } else if primary_disk_usage_percent > 75.0 {
        penalty += 10;
    }

    let health_score = (100 - penalty).clamp(20, 100) as u32;
    let health_status = if health_score >= 85 {
        "optimal".to_string()
    } else if health_score >= 65 {
        "warning".to_string()
    } else {
        "critical".to_string()
    };

    let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
    let host_name = System::host_name().unwrap_or_else(|| "PC".to_string());

    SystemMetrics {
        health_score,
        health_status,
        cpu_usage: (cpu_usage * 10.0).round() / 10.0,
        cpu_cores,
        physical_cores,
        cpu_temp: None,

        memory_used_gb: (memory_used_gb * 10.0).round() / 10.0,
        memory_total_gb: (memory_total_gb * 10.0).round() / 10.0,
        memory_usage_percent: (memory_usage_percent * 10.0).round() / 10.0,
        disks: disk_partitions,
        primary_disk_name,
        primary_disk_used_gb,
        primary_disk_total_gb,
        primary_disk_usage_percent,
        network_up_kbps: tx_rate,
        network_down_kbps: rx_rate,
        uptime_hours: (uptime_hours * 10.0).round() / 10.0,
        process_count,
        os_name,
        host_name,
    }
}

/// 采集真实活跃进程列表 (按内存与 CPU 排序)
pub fn collect_process_list(state: &ProbeState, limit: usize) -> Vec<ProcessItem> {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut items = Vec::new();

    for (pid, proc) in sys.processes() {
        let name = proc.name().to_string_lossy().to_string();
        let name_lower = name.to_lowercase();
        let memory_mb = proc.memory() as f64 / (1024.0 * 1024.0);
        let cpu_percent = proc.cpu_usage();

        let is_protected = PROTECTED_SYSTEM_PROCESSES.iter().any(|&p| name_lower.contains(p));
        let category = if is_protected || pid.as_u32() <= 4 {
            "system".to_string()
        } else if memory_mb > 500.0 || cpu_percent > 10.0 {
            "user".to_string()
        } else {
            "background".to_string()
        };

        items.push(ProcessItem {
            pid: pid.as_u32(),
            name,
            cpu_percent: (cpu_percent * 10.0).round() / 10.0,
            memory_mb: (memory_mb * 10.0).round() / 10.0,
            status: "running".to_string(),
            is_safe_to_kill: !is_protected && pid.as_u32() > 4,
            category,
            exe_path: proc.exe().map(|p| p.to_string_lossy().to_string()),
        });
    }

    // 按内存占用降序排序
    items.sort_by(|a, b| b.memory_mb.partial_cmp(&a.memory_mb).unwrap_or(std::cmp::Ordering::Equal));
    items.truncate(limit);

    items
}

/// 安全结束指定 PID 进程
pub fn safe_kill_process(state: &ProbeState, pid_u32: u32) -> Result<bool, String> {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let pid = Pid::from_u32(pid_u32);
    if let Some(proc) = sys.process(pid) {
        let name_lower = proc.name().to_string_lossy().to_lowercase();
        if PROTECTED_SYSTEM_PROCESSES.iter().any(|&p| name_lower.contains(p)) || pid_u32 <= 4 {
            return Err(format!("禁止结束系统核心保护进程 (PID: {})", pid_u32));
        }

        let success = proc.kill();
        Ok(success)
    } else {
        Err(format!("进程未找到或已退出 (PID: {})", pid_u32))
    }
}

/// 批量安全结束多个 PID 进程
pub fn batch_kill_processes(state: &ProbeState, pids: Vec<u32>) -> Result<usize, String> {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut killed_count = 0;
    for pid_u32 in pids {
        let pid = Pid::from_u32(pid_u32);
        if let Some(proc) = sys.process(pid) {
            let name_lower = proc.name().to_string_lossy().to_lowercase();
            if !PROTECTED_SYSTEM_PROCESSES.iter().any(|&p| name_lower.contains(p)) && pid_u32 > 4 {
                if proc.kill() {
                    killed_count += 1;
                }
            }
        }
    }

    Ok(killed_count)
}

fn now_duration_secs(instant: &Instant) -> f64 {
    let elapsed = instant.elapsed();
    elapsed.as_secs() as f64 + (elapsed.subsec_nanos() as f64 / 1_000_000_000.0)
}

