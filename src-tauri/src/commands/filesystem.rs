use std::path::PathBuf;
// use std::process::Command; // Not needed if using `open::that` or `tauri_plugin_shell` if we were using it from rust side, but `open` crate is often easier for "open in explorer".
// Checking existing dependencies... `tauri-plugin-shell` is used.
// However, opening a folder in explorer is often effectively done via `open` crate or `Command` with "explorer" on Windows.
// Since we are adding a new feature, using `open` crate is the easiest if we can add it, OR we can stick to `std::process::Command` for Windows since the user is on Windows.
// Wait, `tauri-plugin-shell`'s `open` is for URLs.
// I'll use `std::process::Command` for Windows "explorer".

use tauri::{command, State};
use crate::database::AppDatabase;
use crate::error::{AppResult, AppError};

#[command]
pub async fn open_asset_folder(db: State<'_, AppDatabase>, item_id: i64, item_name: String) -> AppResult<()> {
    // 1. Get base path from settings
    let conn = db.conn()?;
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'asset_folder_base'")?;
    let mut rows = stmt.query([])?;
    
    let base_path_str: String = if let Some(row) = rows.next()? {
        row.get(0)?
    } else {
        // Fallback to default
        if let Some(download_dir) = dirs::download_dir() {
            let default_path = download_dir.join("BoothHunter");
            if !default_path.exists() {
                let _ = std::fs::create_dir_all(&default_path);
            }
            default_path.to_string_lossy().to_string()
        } else {
            return Err(AppError::Io("Asset folder base path not set and could not resolve default".to_string()));
        }
    };

    let base_path = PathBuf::from(base_path_str);

    if !base_path.exists() {
        return Err(AppError::Io(format!("Base path does not exist: {:?}", base_path)));
    }

    // 2. Construct folder name: "[<ID>] <Name>"
    // Sanitize name for Windows filename
    let safe_name = sanitize_filename::sanitize(item_name);
    let folder_name = format!("[{}] {}", item_id, safe_name);
    let target_path = base_path.join(&folder_name);
    let prefix = format!("[{}] ", item_id);

    let mut path_to_open = target_path.clone();

    // 3. Check if target exists, if not create it
    if !target_path.exists() {
        let mut existing_path: Option<PathBuf> = None;
        if let Ok(entries) = std::fs::read_dir(&base_path) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() || file_type.is_symlink() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.starts_with(&prefix) {
                                existing_path = Some(entry.path());
                                break;
                            }
                        }
                    }
                }
            }
        }

        if let Some(old_path) = existing_path {
            // Instead of creating a junction, we just open the existing folder
            path_to_open = old_path;
        } else {
            std::fs::create_dir_all(&target_path)
                .map_err(|e| AppError::Io(format!("Failed to create asset folder: {}", e)))?;
        }
    }

    // 4. Open in explorer using 'open' crate
    open::that(&path_to_open)
        .map_err(|e| AppError::Io(format!("Failed to open folder: {}", e)))?;

    Ok(())
}

#[command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}
