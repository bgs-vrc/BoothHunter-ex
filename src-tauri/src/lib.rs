mod booth;
mod commands;
mod database;
mod error;

use tauri::Manager;
#[cfg(desktop)]
use tauri::Emitter;
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

mod config;

#[cfg(desktop)]
use commands::updater::{PendingUpdate, UpdateInfo};
use database::AppDatabase;

#[cfg(desktop)]
async fn check_for_update(app: tauri::AppHandle) {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            log::warn!("Failed to create updater: {e}");
            return;
        }
    };

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => return,
        Err(e) => {
            log::warn!("Update check failed: {e}");
            return;
        }
    };

    let info = UpdateInfo {
        version: update.version.clone(),
        body: update.body.clone(),
    };

    if let Some(state) = app.try_state::<PendingUpdate>() {
        if let Ok(mut pending) = state.0.lock() {
            *pending = Some(update);
        } else {
            log::error!("Failed to acquire lock on PendingUpdate: mutex poisoned");
            return;
        }
    }

    let _ = app.emit("update-available", info);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingUpdate::default())
        .invoke_handler(tauri::generate_handler![
            commands::db::cache_items,
            commands::db::save_search_history,
            commands::db::get_favorites,
            commands::db::add_favorite,
            commands::db::remove_favorite,
            commands::db::get_popular_avatars,
            commands::db::check_avatars_need_update,
            commands::db::update_popular_avatar,
            commands::collections::get_collections,
            commands::collections::create_collection,
            commands::collections::rename_collection,
            commands::collections::update_collection_color,
            commands::collections::delete_collection,
            commands::collections::update_collection_order,
            commands::collections::add_to_collection,
            commands::collections::remove_from_collection,
            commands::collections::get_collection_items,
            commands::collections::get_item_collections,
            commands::collections::set_item_tags,
            commands::collections::get_item_tags,
            commands::collections::get_all_user_tags,
            commands::collections::get_all_item_tags_batch,
            commands::collections::get_all_item_collections_batch,
            commands::collections::get_auto_tags_config,
            commands::collections::set_collection_auto_tags,
            commands::stats::get_all_statistics,
            commands::translation::get_cached_translation,
            commands::translation::save_cached_translation,
            #[cfg(desktop)]
            commands::updater::install_update,
            commands::settings::get_setting,
            commands::settings::save_setting,
            commands::settings::get_db_path,
            commands::settings::move_database,
            commands::filesystem::open_asset_folder,
            commands::filesystem::read_text_file,
            commands::filesystem::write_text_file,
        ])
        .setup(|app| {
            // Initialize database
            let app_data_dir = app.path().app_data_dir()?;
            let config = crate::config::read_config(&app_data_dir);
            let db_dir = config.db_path.map(std::path::PathBuf::from).unwrap_or_else(|| app_data_dir.clone());
            
            let db = AppDatabase::initialize(db_dir, app_data_dir)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            app.manage(db);

            #[cfg(desktop)]
            {
                let _ = app.handle().plugin(tauri_plugin_updater::Builder::new().build());

                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    check_for_update(handle).await;
                });
            }

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
