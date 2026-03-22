use tauri::{command, State, AppHandle, Manager};
use crate::database::AppDatabase;
use crate::error::{AppError, AppResult};

#[command]
pub fn get_setting(db: State<AppDatabase>, key: String) -> AppResult<Option<String>> {
    let conn = db.conn()?;
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query([&key])?;
    
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        // Return default for asset_folder_base if not set
        if key == "asset_folder_base" {
            if let Some(download_dir) = dirs::download_dir() {
                let default_path = download_dir.join("BoothHunter");
                if !default_path.exists() {
                    let _ = std::fs::create_dir_all(&default_path);
                }
                return Ok(Some(default_path.to_string_lossy().to_string()));
            }
        }
        Ok(None)
    }
}

#[command]
pub fn save_setting(db: State<AppDatabase>, key: String, value: String) -> AppResult<()> {
    let conn = db.conn_mut()?;
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
        [key, value],
    )?;
    Ok(())
}

#[command]
pub fn get_db_path(db: State<AppDatabase>) -> AppResult<String> {
    let db_dir = db.db_dir.lock().unwrap();
    Ok(db_dir.to_string_lossy().to_string())
}

#[command]
pub fn move_database(app: AppHandle, db: State<AppDatabase>, new_path: String) -> AppResult<()> {
    let new_dir = std::path::PathBuf::from(new_path);
    db.change_db_path(new_dir.clone())?;

    let app_data_dir = app.path().app_data_dir().map_err(|e| AppError::Database(e.to_string()))?;
    let mut config = crate::config::read_config(&app_data_dir);
    config.db_path = Some(new_dir.to_string_lossy().to_string());
    crate::config::write_config(&app_data_dir, &config)
        .map_err(|e| AppError::Database(format!("Failed to save config: {}", e)))?;

    Ok(())
}
