pub mod common;
pub mod port;
pub mod autostart;
pub mod dns_tester;
#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "linux")]
pub mod linux;

use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Networks, System};

pub struct ProbeState {
    pub sys: Mutex<System>,
    pub networks: Mutex<Networks>,
    pub last_network_check: Mutex<Instant>,
    pub last_rx_bytes: Mutex<u64>,
    pub last_tx_bytes: Mutex<u64>,
}

impl ProbeState {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        sys.refresh_cpu_all();

        let networks = Networks::new_with_refreshed_list();
        let now = Instant::now();

        let mut total_rx = 0;
        let mut total_tx = 0;
        for (_interface, data) in &networks {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }

        Self {
            sys: Mutex::new(sys),
            networks: Mutex::new(networks),
            last_network_check: Mutex::new(now),
            last_rx_bytes: Mutex::new(total_rx),
            last_tx_bytes: Mutex::new(total_tx),
        }
    }
}

