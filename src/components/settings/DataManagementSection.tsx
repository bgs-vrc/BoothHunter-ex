import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, Upload, DatabaseBackup } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import {
  readTextFile,
  writeTextFile,
  getFavorites,
  addFavorite,
  getCollections,
  createCollection,
  getAutoTagsConfig,
  setCollectionAutoTags,
  getBoothItem,
  addToCollection,
} from '../../lib/booth-api';

export default function DataManagementSection() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isImportingFav, setIsImportingFav] = useState(false);
  const [isImportingCol, setIsImportingCol] = useState(false);

  // ---------- Favorites ----------
  const handleExportFavorites = async () => {
    try {
      const favorites = await getFavorites();
      if (favorites.length === 0) {
        toast.info(t.common.error || '내보낼 즐겨찾기가 없습니다.');
        return;
      }
      
      const content = favorites.map(f => `https://booth.pm/ko/items/${f.item_id}`).join('\n');
      const filePath = await save({
        filters: [{ name: 'Text', extensions: ['txt'] }],
        defaultPath: 'boothhunter_favorites.txt',
      });
      
      if (filePath) {
        await writeTextFile(filePath, content);
        toast.success(t.common.error ? '내보내기 완료' : '내보내기 완료');
      }
    } catch (e) {
      console.error(e);
      toast.error('내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleImportFavorites = async () => {
    try {
      const filePath = await open({
        directory: false,
        multiple: false,
        filters: [{ name: 'Text', extensions: ['txt'] }],
      });
      
      if (!filePath || typeof filePath !== 'string') return;

      const content = await readTextFile(filePath);
      const lines = content.split('\n').map(l => l.trim()).filter(l => l);
      
      const itemIds: number[] = [];
      for (const line of lines) {
        const match = line.match(/\/items\/(\d+)/);
        if (match && match[1]) {
          itemIds.push(Number(match[1]));
        } else if (/^\d+$/.test(line)) {
          itemIds.push(Number(line));
        }
      }

      if (itemIds.length === 0) {
        toast.error('파일에서 아무 상품 URL도 찾지 못했습니다.');
        return;
      }

      setIsImportingFav(true);
      const existingFavs = await getFavorites();
      const existingIds = new Set(existingFavs.map(f => f.item_id));
      const toImport = itemIds.filter(id => !existingIds.has(id));

      if (toImport.length === 0) {
        toast.info('모든 항목이 이미 즐겨찾기에 있습니다.');
        setIsImportingFav(false);
        return;
      }

      const toastId = toast.loading(`불러오는 중... (0/${toImport.length})`);
      let successCount = 0;
      
      const autoTagsConfig = await getAutoTagsConfig();
      
      for (let i = 0; i < toImport.length; i++) {
        try {
          // Booth API 1 req/sec limits
          await new Promise(res => setTimeout(res, 1000));
          const item = await getBoothItem(toImport[i]);
          await addFavorite({
            item_id: item.id,
            name: item.name,
            price: item.price,
            thumbnail_url: item.images[0] || null,
            category_name: item.category_name,
            shop_name: item.shop_name,
          });
          
          // 컬렉션 자동 추가 처리
          const promises = [];
          for (const [colIdStr, triggerTags] of Object.entries(autoTagsConfig)) {
            if (triggerTags.length > 0 && triggerTags.some(tag => item.tags.includes(tag))) {
              promises.push(addToCollection(Number(colIdStr), item.id));
            }
          }
          if (promises.length > 0) {
            await Promise.allSettled(promises);
          }

          successCount++;
          toast.loading(`불러오는 중... (${successCount}/${toImport.length})`, { id: toastId });
        } catch (err) {
          console.warn(`Failed to import item ${toImport[i]}:`, err);
        }
      }
      
      toast.success(`가져오기 완료! (${successCount}개 추가됨)`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection-items'] });
      
    } catch (e) {
      console.error(e);
      toast.error('가져오기 중 오류가 발생했습니다.');
    } finally {
      setIsImportingFav(false);
    }
  };

  // ---------- Collections ----------
  const handleExportCollections = async () => {
    try {
      const collections = await getCollections();
      const autoTags = await getAutoTagsConfig();
      
      if (collections.length === 0) {
        toast.info('내보낼 컬렉션이 없습니다.');
        return;
      }

      let content = '';
      for (const col of collections) {
        const tags = autoTags[col.id] || [];
        content += `${col.name}, ${tags.join(', ')}\n`;
      }
      
      const filePath = await save({
        filters: [{ name: 'Text', extensions: ['txt'] }],
        defaultPath: 'boothhunter_collections.txt',
      });
      
      if (filePath) {
        await writeTextFile(filePath, content.trim());
        toast.success('컬렉션 내보내기 완료');
      }
    } catch (e) {
      console.error(e);
      toast.error('컬렉션 내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleImportCollections = async () => {
    try {
      const filePath = await open({
        directory: false,
        multiple: false,
        filters: [{ name: 'Text', extensions: ['txt'] }],
      });
      
      if (!filePath || typeof filePath !== 'string') return;

      const content = await readTextFile(filePath);
      const lines = content.split('\n').map(l => l.trim()).filter(l => l);
      
      if (lines.length === 0) {
        toast.error('파일 내용이 없습니다.');
        return;
      }

      setIsImportingCol(true);
      const toastId = toast.loading('컬렉션 불러오는 중...');
      
      const collections = await getCollections();
      const autoTags = await getAutoTagsConfig();
      
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 0) continue;
        
        const colName = parts[0];
        const tags = parts.slice(1);
        
        let targetColId = collections.find(c => c.name === colName)?.id;
        
        if (!targetColId) {
          targetColId = await createCollection(colName);
          // Wait briefly after creation
          await new Promise(r => setTimeout(r, 100));
        }

        // Merge tags
        if (tags.length > 0) {
          const currentTags = targetColId && autoTags[targetColId] ? autoTags[targetColId] : [];
          const mergedTags = Array.from(new Set([...currentTags, ...tags]));
          await setCollectionAutoTags(targetColId, mergedTags);
        }
      }
      
      toast.success('컬렉션 가져오기 완료!', { id: toastId });
      // Reload page to reflect new settings easily
      window.location.reload();
      
    } catch (e) {
      console.error(e);
      toast.error('컬렉션 가져오기 중 오류가 발생했습니다.');
    } finally {
      setIsImportingCol(false);
    }
  };

  return (
    <section className="space-y-4 mt-8">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
        <DatabaseBackup className="w-5 h-5" />
        데이터 관리
      </h2>
      
      <div className="space-y-6 pt-2">
        {/* Favorites */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800">즐겨찾기 목록</h3>
          <p className="text-sm text-gray-600">
            상품 페이지 URL 리스트를 .txt 포맷으로 내보내고 불러올 수 있습니다. (불러올 때 실제 상품 정보를 가져오므로 시간이 다소 소요될 수 있습니다.)
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleExportFavorites}>
              <Download className="w-4 h-4 mr-2" /> 내보내기
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportFavorites} disabled={isImportingFav}>
              <Upload className="w-4 h-4 mr-2" /> 불러오기
            </Button>
          </div>
        </div>

        {/* Collections */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800">컬렉션 자동 추가 관리 목록</h3>
          <p className="text-sm text-gray-600">
            컬렉션 이름 및 자동 추가 태그 규칙을 .txt 포맷으로 내보내고 불러올 수 있습니다. 중복 태그는 자동으로 걸러집니다.
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleExportCollections}>
              <Download className="w-4 h-4 mr-2" /> 내보내기
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportCollections} disabled={isImportingCol}>
              <Upload className="w-4 h-4 mr-2" /> 불러오기
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
