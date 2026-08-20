use crate::models::PortOccupantInfo;
use crate::probe::ProbeState;
use std::collections::HashSet;
use std::process::Command;
use sysinfo::{Pid, ProcessesToUpdate};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// 查询指定端口的占用详情
pub fn check_port(port: u16, state: &ProbeState) -> PortOccupantInfo {
    #[cfg(target_os = "windows")]
    {
        check_port_windows(port, state)
    }

    #[cfg(not(target_os = "windows"))]
    {
        check_port_unix(port, state)
    }
}

/// 扫描系统中所有处于 LISTENING 状态的活跃端口
pub fn scan_active_ports(state: &ProbeState) -> Vec<PortOccupantInfo> {
    #[cfg(target_os = "windows")]
    {
        scan_active_ports_windows(state)
    }

    #[cfg(not(target_os = "windows"))]
    {
        scan_active_ports_unix(state)
    }
}

#[cfg(target_os = "windows")]
fn check_port_windows(target_port: u16, state: &ProbeState) -> PortOccupantInfo {
    let mut cmd = Command::new("netstat");
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let output = cmd
        .args(["-ano", "-p", "tcp"])
        .output();


    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            // 典型输出: TCP  0.0.0.0:8080  0.0.0.0:0  LISTENING  21044
            if parts.len() >= 5 && parts[0].eq_ignore_ascii_case("TCP") {
                let local_addr = parts[1];
                let state_str = parts[3];
                let pid_str = parts[4];

                if let Some(port_num) = extract_port_from_addr(local_addr) {
                    if port_num == target_port && state_str.eq_ignore_ascii_case("LISTENING") {
                        if let Ok(pid_u32) = pid_str.parse::<u32>() {
                            let mut sys = state.sys.lock().unwrap();
                            sys.refresh_processes(ProcessesToUpdate::All, true);

                            let (name, mem_mb, cpu, exe_path) = if let Some(proc) = sys.process(Pid::from_u32(pid_u32)) {
                                (
                                    Some(proc.name().to_string_lossy().to_string()),
                                    Some((proc.memory() as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0),
                                    Some((proc.cpu_usage() * 10.0).round() / 10.0),
                                    proc.exe().map(|p| p.to_string_lossy().to_string()),
                                )
                            } else {
                                (Some("未知系统进程".to_string()), None, None, None)
                            };

                            return PortOccupantInfo {
                                port: target_port,
                                is_occupied: true,
                                pid: Some(pid_u32),
                                process_name: name,
                                memory_mb: mem_mb,
                                cpu_percent: cpu,
                                protocol: "TCP".to_string(),
                                local_address: local_addr.to_string(),
                                status: "LISTENING (监听中)".to_string(),
                                exe_path,
                            };
                        }
                    }
                }
            }
        }
    }

    PortOccupantInfo {
        port: target_port,
        is_occupied: false,
        pid: None,
        process_name: None,
        memory_mb: None,
        cpu_percent: None,
        protocol: "TCP".to_string(),
        local_address: format!("0.0.0.0:{}", target_port),
        status: "IDLE (端口空闲)".to_string(),
        exe_path: None,
    }
}

#[cfg(target_os = "windows")]
fn scan_active_ports_windows(state: &ProbeState) -> Vec<PortOccupantInfo> {
    let mut list = Vec::new();
    let mut seen_ports = HashSet::new();

    let mut cmd = Command::new("netstat");
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let output = cmd
        .args(["-ano", "-p", "tcp"])
        .output();


    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let mut sys = state.sys.lock().unwrap();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 && parts[0].eq_ignore_ascii_case("TCP") {
                let local_addr = parts[1];
                let state_str = parts[3];
                let pid_str = parts[4];

                if state_str.eq_ignore_ascii_case("LISTENING") {
                    if let Some(port_num) = extract_port_from_addr(local_addr) {
                        if !seen_ports.contains(&port_num) {
                            seen_ports.insert(port_num);
                            let pid_u32 = pid_str.parse::<u32>().unwrap_or(0);

                            let (name, mem_mb, cpu, exe_path) = if let Some(proc) = sys.process(Pid::from_u32(pid_u32)) {
                                (
                                    Some(proc.name().to_string_lossy().to_string()),
                                    Some((proc.memory() as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0),
                                    Some((proc.cpu_usage() * 10.0).round() / 10.0),
                                    proc.exe().map(|p| p.to_string_lossy().to_string()),
                                )
                            } else {
                                (Some("System / Unknown".to_string()), None, None, None)
                            };

                            list.push(PortOccupantInfo {
                                port: port_num,
                                is_occupied: true,
                                pid: if pid_u32 > 0 { Some(pid_u32) } else { None },
                                process_name: name,
                                memory_mb: mem_mb,
                                cpu_percent: cpu,
                                protocol: "TCP".to_string(),
                                local_address: local_addr.to_string(),
                                status: "LISTENING".to_string(),
                                exe_path,
                            });
                        }
                    }
                }
            }
        }
    }

    // 按端口号升序排列
    list.sort_by_key(|item| item.port);
    list
}

/// 从形如 "0.0.0.0:8080" 或 "[::]:8080" 或 "127.0.0.1:3000" 中精准提取端口数字
fn extract_port_from_addr(addr: &str) -> Option<u16> {
    if let Some(idx) = addr.rfind(':') {
        let port_part = &addr[idx + 1..];
        port_part.parse::<u16>().ok()
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn check_port_unix(port: u16, state: &ProbeState) -> PortOccupantInfo {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-sTCP:LISTEN", "-F", "p"])
        .output();

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            if line.starts_with('p') {
                if let Ok(pid_u32) = line[1..].parse::<u32>() {
                    let mut sys = state.sys.lock().unwrap();
                    sys.refresh_processes(ProcessesToUpdate::All, true);

                    let (name, mem_mb, cpu, exe_path) = if let Some(proc) = sys.process(Pid::from_u32(pid_u32)) {
                        (
                            Some(proc.name().to_string_lossy().to_string()),
                            Some((proc.memory() as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0),
                            Some((proc.cpu_usage() * 10.0).round() / 10.0),
                            proc.exe().map(|p| p.to_string_lossy().to_string()),
                        )
                    } else {
                        (Some("Process".to_string()), None, None, None)
                    };

                    return PortOccupantInfo {
                        port,
                        is_occupied: true,
                        pid: Some(pid_u32),
                        process_name: name,
                        memory_mb: mem_mb,
                        cpu_percent: cpu,
                        protocol: "TCP".to_string(),
                        local_address: format!("* :{}", port),
                        status: "LISTENING".to_string(),
                        exe_path,
                    };
                }
            }
        }
    }

    PortOccupantInfo {
        port,
        is_occupied: false,
        pid: None,
        process_name: None,
        memory_mb: None,
        cpu_percent: None,
        protocol: "TCP".to_string(),
        local_address: format!("0.0.0.0:{}", port),
        status: "IDLE".to_string(),
        exe_path: None,
    }
}

#[cfg(not(target_os = "windows"))]
fn scan_active_ports_unix(_state: &ProbeState) -> Vec<PortOccupantInfo> {
    Vec::new()
}
