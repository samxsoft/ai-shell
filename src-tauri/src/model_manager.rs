use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use futures_util::StreamExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub parameter_size: String,
    pub size_bytes: u64,
    pub formatted_size: String,
    pub ram_required: String,
    pub quantization: String,
    pub download_url: String,
    pub filename: String,
    pub is_waldo_certified: bool,
    pub status: String, // "not_downloaded" | "downloading" | "downloaded" | "error"
    pub downloaded_bytes: u64,
    pub progress_percent: f32,
    pub formatted_speed: String,
    pub eta_seconds: u64,
    pub is_active: bool,
    pub local_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelDownloadProgressPayload {
    pub model_id: String,
    pub status: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub progress_percent: f32,
    pub formatted_speed: String,
    pub eta_seconds: u64,
    pub error_msg: Option<String>,
}

pub struct ModelManagerState {
    active_downloads: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    active_model_id: Arc<Mutex<Option<String>>>,
}

impl ModelManagerState {
    pub fn new() -> Self {
        Self {
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
            active_model_id: Arc::new(Mutex::new(None)),
        }
    }
}

pub fn get_models_dir() -> PathBuf {
    let base_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let models_dir = base_dir.join(".ai-shell").join("models");
    if !models_dir.exists() {
        let _ = std::fs::create_dir_all(&models_dir);
    }
    models_dir
}

fn get_catalog_presets() -> Vec<ModelItem> {
    vec![
        ModelItem {
            id: "openwaldo-base-1.5b-q4".to_string(),
            name: "OpenWALDO 1.5B (True Open Source)".to_string(),
            description: "100% auditable open dataset, open weights & training recipes certified by the OpenWALDO community.".to_string(),
            parameter_size: "1.5B".to_string(),
            size_bytes: 980_000_000,
            formatted_size: "980 MB".to_string(),
            ram_required: "~1.5 GB".to_string(),
            quantization: "Q4_K_M".to_string(),
            download_url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf".to_string(),
            filename: "openwaldo-1.5b-q4_k_m.gguf".to_string(),
            is_waldo_certified: true,
            status: "not_downloaded".to_string(),
            downloaded_bytes: 0,
            progress_percent: 0.0,
            formatted_speed: "0 MB/s".to_string(),
            eta_seconds: 0,
            is_active: false,
            local_path: None,
        },
        ModelItem {
            id: "qwen2.5-0.5b-instruct-q4".to_string(),
            name: "Qwen2.5-Coder 0.5B (Ultra-Light)".to_string(),
            description: "Sub-400MB lightning-fast local model. Ideal for instant CPU diagnosis on resource-constrained devices.".to_string(),
            parameter_size: "0.5B".to_string(),
            size_bytes: 398_000_000,
            formatted_size: "398 MB".to_string(),
            ram_required: "~0.8 GB".to_string(),
            quantization: "Q4_K_M".to_string(),
            download_url: "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf".to_string(),
            filename: "qwen2.5-coder-0.5b-instruct-q4_k_m.gguf".to_string(),
            is_waldo_certified: false,
            status: "not_downloaded".to_string(),
            downloaded_bytes: 0,
            progress_percent: 0.0,
            formatted_speed: "0 MB/s".to_string(),
            eta_seconds: 0,
            is_active: false,
            local_path: None,
        },
        ModelItem {
            id: "qwen2.5-1.5b-instruct-q4".to_string(),
            name: "Qwen2.5-Coder 1.5B (Recommended)".to_string(),
            description: "Balanced speed & deep system diagnostic reasoning. Low memory footprint with strong script analysis.".to_string(),
            parameter_size: "1.5B".to_string(),
            size_bytes: 1_120_000_000,
            formatted_size: "1.12 GB".to_string(),
            ram_required: "~1.8 GB".to_string(),
            quantization: "Q4_K_M".to_string(),
            download_url: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf".to_string(),
            filename: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf".to_string(),
            is_waldo_certified: false,
            status: "not_downloaded".to_string(),
            downloaded_bytes: 0,
            progress_percent: 0.0,
            formatted_speed: "0 MB/s".to_string(),
            eta_seconds: 0,
            is_active: false,
            local_path: None,
        },
        ModelItem {
            id: "llama-3.2-1b-instruct-q4".to_string(),
            name: "Llama-3.2 1B Instruct (Fast Generalist)".to_string(),
            description: "Meta's latest lightweight compact model optimized for edge devices and fast conversational troubleshooting.".to_string(),
            parameter_size: "1B".to_string(),
            size_bytes: 815_000_000,
            formatted_size: "815 MB".to_string(),
            ram_required: "~1.2 GB".to_string(),
            quantization: "Q4_K_M".to_string(),
            download_url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf".to_string(),
            filename: "llama-3.2-1b-instruct-q4_k_m.gguf".to_string(),
            is_waldo_certified: false,
            status: "not_downloaded".to_string(),
            downloaded_bytes: 0,
            progress_percent: 0.0,
            formatted_speed: "0 MB/s".to_string(),
            eta_seconds: 0,
            is_active: false,
            local_path: None,
        },
        ModelItem {
            id: "qwen2.5-3b-instruct-q4".to_string(),
            name: "Qwen2.5 3B Instruct (Power Diagnostic)".to_string(),
            description: "High-precision code and root-cause analysis with deep multi-step ActionCard execution planning.".to_string(),
            parameter_size: "3B".to_string(),
            size_bytes: 2_150_000_000,
            formatted_size: "2.15 GB".to_string(),
            ram_required: "~3.2 GB".to_string(),
            quantization: "Q4_K_M".to_string(),
            download_url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf".to_string(),
            filename: "qwen2.5-3b-instruct-q4_k_m.gguf".to_string(),
            is_waldo_certified: false,
            status: "not_downloaded".to_string(),
            downloaded_bytes: 0,
            progress_percent: 0.0,
            formatted_speed: "0 MB/s".to_string(),
            eta_seconds: 0,
            is_active: false,
            local_path: None,
        },
    ]
}

pub async fn list_models(state: &ModelManagerState) -> Vec<ModelItem> {
    let models_dir = get_models_dir();
    let mut catalog = get_catalog_presets();
    let active_downloads = state.active_downloads.lock().await;
    let active_id = state.active_model_id.lock().await;

    for item in catalog.iter_mut() {
        let file_path = models_dir.join(&item.filename);
        let part_path = models_dir.join(format!("{}.part", &item.filename));

        if active_downloads.contains_key(&item.id) {
            item.status = "downloading".to_string();
            if part_path.exists() {
                if let Ok(meta) = part_path.metadata() {
                    item.downloaded_bytes = meta.len();
                    if item.size_bytes > 0 {
                        item.progress_percent = (meta.len() as f32 / item.size_bytes as f32) * 100.0;
                    }
                }
            }
        } else if file_path.exists() {
            item.status = "downloaded".to_string();
            if let Ok(meta) = file_path.metadata() {
                item.downloaded_bytes = meta.len();
                item.progress_percent = 100.0;
            }
            item.local_path = Some(file_path.to_string_lossy().to_string());
        } else if part_path.exists() {
            item.status = "paused".to_string();
            if let Ok(meta) = part_path.metadata() {
                item.downloaded_bytes = meta.len();
                if item.size_bytes > 0 {
                    item.progress_percent = (meta.len() as f32 / item.size_bytes as f32) * 100.0;
                }
            }
        } else {
            item.status = "not_downloaded".to_string();
            item.downloaded_bytes = 0;
            item.progress_percent = 0.0;
        }

        if let Some(ref current_active) = *active_id {
            item.is_active = current_active == &item.id;
        }
    }

    catalog
}

pub async fn download_model(
    app: AppHandle,
    state: &ModelManagerState,
    model_id: String,
) -> Result<String, String> {
    let catalog = get_catalog_presets();
    let model = catalog
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Model '{}' not found in presets", model_id))?;

    let models_dir = get_models_dir();
    let final_path = models_dir.join(&model.filename);
    let part_path = models_dir.join(format!("{}.part", &model.filename));

    if final_path.exists() {
        return Ok(format!("Model '{}' is already downloaded", model.name));
    }

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut downloads = state.active_downloads.lock().await;
        if downloads.contains_key(&model_id) {
            return Err("Model download is already in progress".to_string());
        }
        downloads.insert(model_id.clone(), cancel_flag.clone());
    }

    let app_clone = app.clone();
    let model_id_clone = model_id.clone();
    let active_downloads_map = state.active_downloads.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(3600))
            .build()
            .unwrap_or_default();

        let res = match client.get(&model.download_url).send().await {
            Ok(r) => r,
            Err(e) => {
                let _ = app_clone.emit(
                    "model_download_progress",
                    ModelDownloadProgressPayload {
                        model_id: model_id_clone.clone(),
                        status: "error".to_string(),
                        downloaded_bytes: 0,
                        total_bytes: model.size_bytes,
                        progress_percent: 0.0,
                        formatted_speed: "0 MB/s".to_string(),
                        eta_seconds: 0,
                        error_msg: Some(format!("Network request failed: {}", e)),
                    },
                );
                let mut map = active_downloads_map.lock().await;
                map.remove(&model_id_clone);
                return;
            }
        };

        if !res.status().is_success() {
            let _ = app_clone.emit(
                "model_download_progress",
                ModelDownloadProgressPayload {
                    model_id: model_id_clone.clone(),
                    status: "error".to_string(),
                    downloaded_bytes: 0,
                    total_bytes: model.size_bytes,
                    progress_percent: 0.0,
                    formatted_speed: "0 MB/s".to_string(),
                    eta_seconds: 0,
                    error_msg: Some(format!("Server returned HTTP {}", res.status())),
                },
            );
            let mut map = active_downloads_map.lock().await;
            map.remove(&model_id_clone);
            return;
        }

        let total_size = res.content_length().unwrap_or(model.size_bytes);
        let mut file = match tokio::fs::File::create(&part_path).await {
            Ok(f) => f,
            Err(e) => {
                let _ = app_clone.emit(
                    "model_download_progress",
                    ModelDownloadProgressPayload {
                        model_id: model_id_clone.clone(),
                        status: "error".to_string(),
                        downloaded_bytes: 0,
                        total_bytes: total_size,
                        progress_percent: 0.0,
                        formatted_speed: "0 MB/s".to_string(),
                        eta_seconds: 0,
                        error_msg: Some(format!("Failed to create file: {}", e)),
                    },
                );
                let mut map = active_downloads_map.lock().await;
                map.remove(&model_id_clone);
                return;
            }
        };

        let mut stream = res.bytes_stream();
        let mut downloaded: u64 = 0;
        let mut last_emit = Instant::now();
        let mut last_bytes = 0u64;

        while let Some(chunk_result) = stream.next().await {
            if cancel_flag.load(Ordering::Relaxed) {
                drop(file);
                let _ = tokio::fs::remove_file(&part_path).await;
                let _ = app_clone.emit(
                    "model_download_progress",
                    ModelDownloadProgressPayload {
                        model_id: model_id_clone.clone(),
                        status: "not_downloaded".to_string(),
                        downloaded_bytes: 0,
                        total_bytes: total_size,
                        progress_percent: 0.0,
                        formatted_speed: "0 MB/s".to_string(),
                        eta_seconds: 0,
                        error_msg: None,
                    },
                );
                let mut map = active_downloads_map.lock().await;
                map.remove(&model_id_clone);
                return;
            }

            match chunk_result {
                Ok(chunk) => {
                    if let Err(e) = file.write_all(&chunk).await {
                        let _ = app_clone.emit(
                            "model_download_progress",
                            ModelDownloadProgressPayload {
                                model_id: model_id_clone.clone(),
                                status: "error".to_string(),
                                downloaded_bytes: downloaded,
                                total_bytes: total_size,
                                progress_percent: (downloaded as f32 / total_size as f32) * 100.0,
                                formatted_speed: "0 MB/s".to_string(),
                                eta_seconds: 0,
                                error_msg: Some(format!("Disk write error: {}", e)),
                            },
                        );
                        let mut map = active_downloads_map.lock().await;
                        map.remove(&model_id_clone);
                        return;
                    }
                    downloaded += chunk.len() as u64;

                    if last_emit.elapsed().as_millis() >= 300 {
                        let elapsed_sec = last_emit.elapsed().as_secs_f64();
                        let bytes_diff = downloaded.saturating_sub(last_bytes);
                        let bytes_per_sec = (bytes_diff as f64 / elapsed_sec) as u64;

                        let speed_formatted = if bytes_per_sec > 1024 * 1024 {
                            format!("{:.1} MB/s", bytes_per_sec as f64 / (1024.0 * 1024.0))
                        } else {
                            format!("{:.1} KB/s", bytes_per_sec as f64 / 1024.0)
                        };

                        let eta_secs = if bytes_per_sec > 0 {
                            total_size.saturating_sub(downloaded) / bytes_per_sec
                        } else {
                            0
                        };

                        let percent = if total_size > 0 {
                            (downloaded as f32 / total_size as f32) * 100.0
                        } else {
                            0.0
                        };

                        let _ = app_clone.emit(
                            "model_download_progress",
                            ModelDownloadProgressPayload {
                                model_id: model_id_clone.clone(),
                                status: "downloading".to_string(),
                                downloaded_bytes: downloaded,
                                total_bytes: total_size,
                                progress_percent: percent,
                                formatted_speed: speed_formatted.clone(),
                                eta_seconds: eta_secs,
                                error_msg: None,
                            },
                        );

                        last_emit = Instant::now();
                        last_bytes = downloaded;
                    }
                }
                Err(e) => {
                    let _ = app_clone.emit(
                        "model_download_progress",
                        ModelDownloadProgressPayload {
                            model_id: model_id_clone.clone(),
                            status: "error".to_string(),
                            downloaded_bytes: downloaded,
                            total_bytes: total_size,
                            progress_percent: (downloaded as f32 / total_size as f32) * 100.0,
                            formatted_speed: "0 MB/s".to_string(),
                            eta_seconds: 0,
                            error_msg: Some(format!("Stream read error: {}", e)),
                        },
                    );
                    let mut map = active_downloads_map.lock().await;
                    map.remove(&model_id_clone);
                    return;
                }
            }
        }

        let _ = file.flush().await;
        drop(file);

        // Rename .part to .gguf
        if let Err(e) = tokio::fs::rename(&part_path, &final_path).await {
            let _ = app_clone.emit(
                "model_download_progress",
                ModelDownloadProgressPayload {
                    model_id: model_id_clone.clone(),
                    status: "error".to_string(),
                    downloaded_bytes: downloaded,
                    total_bytes: total_size,
                    progress_percent: 100.0,
                    formatted_speed: "0 MB/s".to_string(),
                    eta_seconds: 0,
                    error_msg: Some(format!("Failed to rename final model file: {}", e)),
                },
            );
        } else {
            let _ = app_clone.emit(
                "model_download_progress",
                ModelDownloadProgressPayload {
                    model_id: model_id_clone.clone(),
                    status: "downloaded".to_string(),
                    downloaded_bytes: total_size,
                    total_bytes: total_size,
                    progress_percent: 100.0,
                    formatted_speed: "Complete".to_string(),
                    eta_seconds: 0,
                    error_msg: None,
                },
            );
        }

        let mut map = active_downloads_map.lock().await;
        map.remove(&model_id_clone);
    });

    Ok(format!("Download started for model '{}'", model.name))
}

pub async fn cancel_download(state: &ModelManagerState, model_id: String) -> Result<String, String> {
    let downloads = state.active_downloads.lock().await;
    if let Some(flag) = downloads.get(&model_id) {
        flag.store(true, Ordering::Relaxed);
        Ok(format!("Cancelling download for model '{}'", model_id))
    } else {
        // If not in memory but file exists
        let catalog = get_catalog_presets();
        if let Some(model) = catalog.into_iter().find(|m| m.id == model_id) {
            let part_path = get_models_dir().join(format!("{}.part", &model.filename));
            if part_path.exists() {
                let _ = std::fs::remove_file(part_path);
            }
        }
        Ok("Download stopped".to_string())
    }
}

pub async fn delete_model(state: &ModelManagerState, model_id: String) -> Result<String, String> {
    let catalog = get_catalog_presets();
    let model = catalog
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Model '{}' not found", model_id))?;

    let models_dir = get_models_dir();
    let final_path = models_dir.join(&model.filename);
    let part_path = models_dir.join(format!("{}.part", &model.filename));

    if final_path.exists() {
        std::fs::remove_file(&final_path).map_err(|e| format!("Failed to delete model file: {}", e))?;
    }
    if part_path.exists() {
        let _ = std::fs::remove_file(&part_path);
    }

    let mut active = state.active_model_id.lock().await;
    if active.as_deref() == Some(&model_id) {
        *active = None;
    }

    Ok(format!("Model '{}' deleted successfully", model.name))
}

pub async fn set_active_model(state: &ModelManagerState, model_id: String) -> Result<String, String> {
    let mut active = state.active_model_id.lock().await;
    *active = Some(model_id.clone());
    Ok(format!("Active local model set to '{}'", model_id))
}

pub fn open_models_folder() -> Result<String, String> {
    let path = get_models_dir();
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok("Opened models folder".to_string())
}
