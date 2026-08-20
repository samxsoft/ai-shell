use crate::models::{DockerContainerItem, DockerImageItem, DockerOverview};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// 创建无弹窗命令行子进程
fn create_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}

/// 扫描全量 Docker 运行环境与存储空间占用
pub fn scan_docker_environment() -> DockerOverview {
    // 1. 检查 docker CLI 是否已安装
    let version_output = create_cmd("docker")
        .args(["--version"])
        .output();

    let is_installed = match &version_output {
        Ok(out) => out.status.success(),
        Err(_) => false,
    };

    if !is_installed {
        return DockerOverview {
            is_installed: false,
            is_running: false,
            version: None,
            containers_count: 0,
            stopped_containers_count: 0,
            images_count: 0,
            dangling_images_count: 0,
            volumes_count: 0,
            images_size: "0 B".to_string(),
            images_reclaimable: "0 B".to_string(),
            containers_size: "0 B".to_string(),
            containers_reclaimable: "0 B".to_string(),
            volumes_size: "0 B".to_string(),
            volumes_reclaimable: "0 B".to_string(),
            build_cache_size: "0 B".to_string(),
            build_cache_reclaimable: "0 B".to_string(),
            total_reclaimable: "0 B".to_string(),
            stopped_containers: Vec::new(),
            dangling_images: Vec::new(),
        };
    }

    let version_str = String::from_utf8_lossy(&version_output.unwrap().stdout).trim().to_string();

    // 2. 检查 docker daemon 是否正在运行
    let ping_output = create_cmd("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output();

    let is_running = match &ping_output {
        Ok(out) => out.status.success(),
        Err(_) => false,
    };

    if !is_running {
        return DockerOverview {
            is_installed: true,
            is_running: false,
            version: Some(version_str),
            containers_count: 0,
            stopped_containers_count: 0,
            images_count: 0,
            dangling_images_count: 0,
            volumes_count: 0,
            images_size: "0 B".to_string(),
            images_reclaimable: "0 B".to_string(),
            containers_size: "0 B".to_string(),
            containers_reclaimable: "0 B".to_string(),
            volumes_size: "0 B".to_string(),
            volumes_reclaimable: "0 B".to_string(),
            build_cache_size: "0 B".to_string(),
            build_cache_reclaimable: "0 B".to_string(),
            total_reclaimable: "0 B".to_string(),
            stopped_containers: Vec::new(),
            dangling_images: Vec::new(),
        };
    }

    // 3. 读取已停止的容器
    let mut stopped_containers = Vec::new();
    if let Ok(out) = create_cmd("docker")
        .args(["ps", "-a", "--filter", "status=exited", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Size}}|{{.CreatedAt}}"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                stopped_containers.push(DockerContainerItem {
                    id: parts[0].to_string(),
                    names: parts[1].to_string(),
                    image: parts[2].to_string(),
                    status: parts[3].to_string(),
                    state: "exited".to_string(),
                    size: parts.get(4).unwrap_or(&"-").to_string(),
                    created: parts.get(5).unwrap_or(&"-").to_string(),
                });
            }
        }
    }

    // 4. 读取悬挂未使用的镜像
    let mut dangling_images = Vec::new();
    if let Ok(out) = create_cmd("docker")
        .args(["images", "-f", "dangling=true", "--format", "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedSince}}"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                dangling_images.push(DockerImageItem {
                    id: parts[0].to_string(),
                    repository: parts[1].to_string(),
                    tag: parts[2].to_string(),
                    size: parts[3].to_string(),
                    created_since: parts.get(4).unwrap_or(&"-").to_string(),
                    is_dangling: true,
                });
            }
        }
    }

    // 5. 解析 docker system df
    let mut images_size = "0 B".to_string();
    let mut images_reclaimable = "0 B".to_string();
    let mut containers_size = "0 B".to_string();
    let mut containers_reclaimable = "0 B".to_string();
    let mut volumes_size = "0 B".to_string();
    let mut volumes_reclaimable = "0 B".to_string();
    let mut build_cache_size = "0 B".to_string();
    let mut build_cache_reclaimable = "0 B".to_string();

    let mut images_count = dangling_images.len();
    let mut containers_count = stopped_containers.len();
    let mut volumes_count = 0;

    if let Ok(df_out) = create_cmd("docker")
        .args(["system", "df", "--format", "{{.Type}}|{{.TotalCount}}|{{.Size}}|{{.Reclaimable}}"])
        .output()
    {
        let df_text = String::from_utf8_lossy(&df_out.stdout);
        for line in df_text.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                let type_name = parts[0].trim().to_lowercase();
                let count: usize = parts[1].trim().parse().unwrap_or(0);
                let size = parts[2].trim().to_string();
                let reclaimable = parts[3].trim().to_string();

                if type_name.contains("image") {
                    images_count = count;
                    images_size = size;
                    images_reclaimable = reclaimable;
                } else if type_name.contains("container") {
                    containers_count = count;
                    containers_size = size;
                    containers_reclaimable = reclaimable;
                } else if type_name.contains("volume") {
                    volumes_count = count;
                    volumes_size = size;
                    volumes_reclaimable = reclaimable;
                } else if type_name.contains("build") {
                    build_cache_size = size;
                    build_cache_reclaimable = reclaimable;
                }
            }
        }
    }

    let stopped_count = stopped_containers.len();
    let dangling_count = dangling_images.len();

    DockerOverview {
        is_installed: true,
        is_running: true,
        version: Some(version_str),
        containers_count,
        stopped_containers_count: stopped_count,
        images_count,
        dangling_images_count: dangling_count,
        volumes_count,
        images_size,
        images_reclaimable,
        containers_size,
        containers_reclaimable,
        volumes_size,
        volumes_reclaimable,
        build_cache_size,
        build_cache_reclaimable,
        total_reclaimable: "可深度回收".to_string(),
        stopped_containers,
        dangling_images,
    }
}

/// 执行 Docker 针对性资源清理
pub fn prune_docker_target(target: &str) -> Result<String, String> {
    let mut cmd = match target {
        "containers" => {
            let mut c = create_cmd("docker");
            c.args(["container", "prune", "-f"]);
            c
        }
        "images" => {
            let mut c = create_cmd("docker");
            c.args(["image", "prune", "-f"]);
            c
        }
        "builder" => {
            let mut c = create_cmd("docker");
            c.args(["builder", "prune", "-f"]);
            c
        }
        "system" => {
            let mut c = create_cmd("docker");
            c.args(["system", "prune", "-f"]);
            c
        }
        _ => return Err(format!("未知的清理目标: {}", target)),
    };

    let output = cmd.output().map_err(|e| format!("执行 Docker 清理失败: {}", e))?;
    if output.status.success() {
        let msg = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if msg.is_empty() { "清理完成，无冗余资源需释放。".to_string() } else { msg })
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if err_msg.is_empty() { "清理执行未成功".to_string() } else { err_msg })
    }
}
