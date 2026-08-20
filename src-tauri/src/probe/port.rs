use crate::models::PortOccupantInfo;
use crate::probe::ProbeState;
use std::process::Command;
use sysinfo::{Pid, ProcessesToUpdate};

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

#[cfg(target_os = "windows")]
fn check_port_windows(port: u16, state: &ProbeState) -> PortOccupantInfo {
    let output = Command::new("netstat")
        .args(["-ano", "-p", "tcp"])
        .output();

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let port_pattern = format!(":{}", port);

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            // 典型输出: TCP  0.0.0.0:8080  0.0.0.0:0  LISTENING  21044
            if parts.len() >= 5 && parts[0].eq_ignore_ascii_case("TCP") {
                let local_addr = parts[1];
                let state_str = parts[3];
                let pid_str = parts[4];

                if local_addr.ends_with(&port_pattern) && state_str.eq_ignore_ascii_case("LISTENING") {
                    if let Ok(pid_u32) = pid_str.parse::<u32>() {
                        let mut sys = state.sys.lock().unwrap();
                        sys.refresh_processes(ProcessesToUpdate::All, true);

                        let (name, mem_mb, cpu) = if let Some(proc) = sys.process(Pid::from_u32(pid_u32)) {
                            (
                                Some(proc.name().to_string_lossy().to_string()),
                                Some((proc.memory() as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0),
                                Some((proc.cpu_usage() * 10.0).round() / 10.0),
                            )
                        } else {
                            (Some("未知进程".to_string()), None, None)
                        };

                        return PortOccupantInfo {
                            port,
                            is_occupied: true,
                            pid: Some(pid_u32),
                            process_name: name,
                            memory_mb: mem_mb,
                            cpu_percent: cpu,
                            protocol: "TCP".to_string(),
                            local_address: local_addr.to_string(),
                            status: "LISTENING (监听中)".to_string(),
                        };
                    }
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
        status: "IDLE (端口空闲)".to_string(),
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

                    let (name, mem_mb, cpu) = if let Some(proc) = sys.process(Pid::from_u32(pid_u32)) {
                        (
                            Some(proc.name().to_string_lossy().to_string()),
                            Some((proc.memory() as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0),
                            Some((proc.cpu_usage() * 10.0).round() / 10.0),
                        )
                    } else {
                        (Some("Process".to_string()), None, None)
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
    }
}
