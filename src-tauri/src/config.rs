use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub db_path: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self { db_path: None }
    }
}

pub fn read_config(app_data_dir: &Path) -> AppConfig {
    let config_path = app_data_dir.join("config.json");
    if config_path.exists() {
        if let Ok(data) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&data) {
                return config;
            }
        }
    }
    AppConfig::default()
}

pub fn write_config(app_data_dir: &Path, config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = app_data_dir.join("config.json");
    if !app_data_dir.exists() {
        std::fs::create_dir_all(app_data_dir)?;
    }
    let data = serde_json::to_string_pretty(config)?;
    std::fs::write(config_path, data)?;
    Ok(())
}
