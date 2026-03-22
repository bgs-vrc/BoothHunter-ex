import { invoke } from '@tauri-apps/api/core';

export const SETTINGS_KEYS = {
  ASSET_FOLDER_BASE: 'asset_folder_base',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  return await invoke('get_setting', { key });
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return await invoke('save_setting', { key, value });
}

export async function openAssetFolder(itemId: number, itemName: string): Promise<void> {
  return await invoke('open_asset_folder', { itemId, itemName });
}

export async function getDbPath(): Promise<string> {
  return await invoke('get_db_path');
}

export async function moveDatabase(newPath: string): Promise<void> {
  return await invoke('move_database', { newPath });
}
