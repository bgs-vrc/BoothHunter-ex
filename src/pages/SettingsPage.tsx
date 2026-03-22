import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { getSetting, saveSetting, SETTINGS_KEYS, getDbPath, moveDatabase } from '../lib/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FolderOpen, Save, Database, Tags } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import AutoCollectionManager from '../components/settings/AutoCollectionManager';

export default function SettingsPage() {
  const { t } = useI18n();
  const [assetFolderPath, setAssetFolderPath] = useState('');
  const [dbPath, setDbPath] = useState('');
  const [initialDbPath, setInitialDbPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const path = await getSetting(SETTINGS_KEYS.ASSET_FOLDER_BASE);
        if (path) {
          setAssetFolderPath(path);
        }
        const currentDbPath = await getDbPath();
        if (currentDbPath) {
          setDbPath(currentDbPath);
          setInitialDbPath(currentDbPath);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error(t.common.error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [t.common.error]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSetting(SETTINGS_KEYS.ASSET_FOLDER_BASE, assetFolderPath);

      if (dbPath !== initialDbPath) {
        const loadingToast = toast.loading(t.settings.database.moving);
        try {
          await moveDatabase(dbPath);
          setInitialDbPath(dbPath);
          toast.success(t.settings.saved, { id: loadingToast });
        } catch (error) {
          console.error('Failed to move DB:', error);
          toast.error(t.common.error, { id: loadingToast });
          setDbPath(initialDbPath); // Revert on failure
        }
      } else {
        toast.success(t.settings.saved);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t.common.error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowseAsset = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: assetFolderPath || undefined,
      });
      if (selected && typeof selected === 'string') {
        setAssetFolderPath(selected);
      }
    } catch (error) {
      console.error('Failed to open dialog:', error);
      toast.error(t.common.error);
    }
  };

  const handleBrowseDb = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: dbPath || undefined,
      });
      if (selected && typeof selected === 'string' && selected !== dbPath) {
        setDbPath(selected);
      }
    } catch (error) {
      console.error('Failed to open dialog:', error);
      toast.error(t.common.error);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">{t.common.loading}</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t.settings.title}</h1>

      <div className="space-y-8">
        {/* Database Folder Setting */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
            <Database className="w-5 h-5" />
            {t.settings.database.title}
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{t.settings.database.description}</p>
            <div className="flex gap-2">
              <Input
                value={dbPath}
                onChange={(e) => setDbPath(e.target.value)}
                placeholder={t.settings.database.placeholder}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowseDb}
                title={t.settings.database.browse}
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Auto Collection Setting */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
            <Tags className="w-5 h-5" />
            {t.settings.autoCollection.title}
          </h2>
          <p className="text-sm text-gray-600">{t.settings.autoCollection.description}</p>
          <AutoCollectionManager />
        </section>

        {/* Asset Folder Setting */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {t.settings.assetFolder.title}
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{t.settings.assetFolder.description}</p>
            <div className="flex gap-2">
              <Input
                value={assetFolderPath}
                onChange={(e) => setAssetFolderPath(e.target.value)}
                placeholder={t.settings.assetFolder.placeholder}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowseAsset}
                title={t.settings.assetFolder.browse}
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {t.settings.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
