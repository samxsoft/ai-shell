use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskPartition {
    pub mount_point: String,
    pub name: String,
    pub total_gb: f64,
    pub available_gb: f64,
    pub used_gb: f64,
    pub usage_percent: f64,
    pub file_system: String,
    pub is_system_disk: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    #[serde(rename = "healthScore")]
    pub health_score: u32,
    #[serde(rename = "healthStatus")]
    pub health_status: String,
    #[serde(rename = "cpuUsage")]
    pub cpu_usage: f32,
    #[serde(rename = "cpuCores")]
    pub cpu_cores: usize,
    #[serde(rename = "physicalCores")]
    pub physical_cores: usize,
    #[serde(rename = "cpuTemp")]
    pub cpu_temp: Option<f32>,


    #[serde(rename = "memoryUsedGB", alias = "memoryUsedGb")]
    pub memory_used_gb: f64,
    #[serde(rename = "memoryTotalGB", alias = "memoryTotalGb")]
    pub memory_total_gb: f64,
    #[serde(rename = "memoryUsagePercent")]
    pub memory_usage_percent: f64,

    pub disks: Vec<DiskPartition>,
    #[serde(rename = "primaryDiskName")]
    pub primary_disk_name: String,
    #[serde(rename = "primaryDiskUsedGB", alias = "primaryDiskUsedGb")]
    pub primary_disk_used_gb: f64,
    #[serde(rename = "primaryDiskTotalGB", alias = "primaryDiskTotalGb")]
    pub primary_disk_total_gb: f64,
    #[serde(rename = "primaryDiskUsagePercent")]
    pub primary_disk_usage_percent: f64,

    #[serde(rename = "networkUpKBps", alias = "networkUpKbps")]
    pub network_up_kbps: u64,
    #[serde(rename = "networkDownKBps", alias = "networkDownKbps")]
    pub network_down_kbps: u64,
    #[serde(rename = "uptimeHours")]
    pub uptime_hours: f64,
    #[serde(rename = "processCount")]
    pub process_count: usize,
    #[serde(rename = "osName")]
    pub os_name: String,
    #[serde(rename = "hostName")]
    pub host_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    #[serde(rename = "cpuPercent")]
    pub cpu_percent: f32,
    #[serde(rename = "memoryMB", alias = "memoryMb")]
    pub memory_mb: f64,
    pub status: String,
    #[serde(rename = "isSafeToKill")]
    pub is_safe_to_kill: bool,
    pub category: String,
    #[serde(rename = "exePath")]
    pub exe_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GarbageItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GarbageScanResult {
    pub total_bytes: u64,
    pub total_formatted: String,
    pub items: Vec<GarbageItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortOccupantInfo {
    pub port: u16,
    pub is_occupied: bool,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub memory_mb: Option<f64>,
    pub cpu_percent: Option<f32>,
    pub protocol: String,
    pub local_address: String,
    pub status: String,
    pub exe_path: Option<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutostartEntry {
    pub name: String,
    pub command: String,
    pub location: String, // "HKCU" | "HKLM" | "StartupFolder" | "LaunchAgent" | "DesktopEntry"
    pub enabled: bool,
    pub description: Option<String>,
    pub publisher: Option<String>,
    pub impact: Option<String>,
    pub safe_to_disable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsPingResult {
    pub name: String,
    pub primary_ip: String,
    pub secondary_ip: String,
    pub latency_ms: Option<u64>,
    pub is_current: bool,
    pub status: String, // "fast" | "normal" | "slow" | "unreachable"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LargeFileInfo {
    pub path: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub file_type: String, // "virtual_disk" | "archive" | "media" | "installer" | "database" | "other"
    pub modified_time: String,
}


