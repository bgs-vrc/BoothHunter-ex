import React, { useState, useMemo } from 'react';
import { useCollections, useAutoTagsConfig } from '../../hooks/useCollections';
import { useI18n } from '../../lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, ChevronRight } from 'lucide-react';

export default function AutoCollectionManager() {
  const { collections, setAutoTags } = useCollections();
  const { data: autoTagsConfig = {} } = useAutoTagsConfig();
  const { t } = useI18n();

  const [selectedColId, setSelectedColId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');

  const rightListIdsSet = useMemo(
    () => new Set(Object.keys(autoTagsConfig).map(Number)),
    [autoTagsConfig],
  );

  const rightCollections = collections.filter(
    (c) => rightListIdsSet.has(c.id) || c.id === selectedColId,
  );
  const leftCollections = collections.filter(
    (c) => !rightListIdsSet.has(c.id) && c.id !== selectedColId,
  );

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && selectedColId) {
      e.preventDefault();
      const currentTags = autoTagsConfig[selectedColId] || [];
      const newTag = tagInput.trim();
      if (!currentTags.includes(newTag)) {
        await setAutoTags({
          collectionId: selectedColId,
          tags: [...currentTags, newTag],
        });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = async (colId: number, tagToRemove: string) => {
    const currentTags = autoTagsConfig[colId] || [];
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    await setAutoTags({ collectionId: colId, tags: newTags });
    // Keep it selected so the UI doesn't suddenly disappear if it was the last tag
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border rounded-xl p-4 bg-white shadow-sm">
      {/* Left List */}
      <div className="flex flex-col border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
        <h3 className="font-semibold text-sm mb-3 text-gray-700">
          {t.settings.autoCollection.allCollections}
        </h3>
        <div className="flex-1 overflow-y-auto max-h-[320px] space-y-1">
          {leftCollections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg text-sm group transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate flex-1 text-gray-800">{c.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setSelectedColId(c.id);
                  setTagInput('');
                }}
              >
                <Plus className="w-4 h-4 text-indigo-500" />
              </Button>
            </div>
          ))}
          {leftCollections.length === 0 && (
            <div className="text-sm text-gray-400 p-2 text-center mt-4">
              {t.collections.emptyList}
            </div>
          )}
        </div>
      </div>

      {/* Right List & Details */}
      <div className="flex flex-col md:pl-2">
        <h3 className="font-semibold text-sm mb-3 text-gray-700">
          {t.settings.autoCollection.autoCollections}
        </h3>
        <div className="flex-1 overflow-y-auto max-h-[320px] space-y-3">
          {rightCollections.map((c) => {
            const isSelected = c.id === selectedColId;
            const tags = autoTagsConfig[c.id] || [];
            return (
              <div
                key={c.id}
                className={`border rounded-lg transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-indigo-500 ring-1 ring-indigo-100 bg-indigo-50/10'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer bg-white"
                  onClick={() => {
                    setSelectedColId(isSelected ? null : c.id);
                    setTagInput('');
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="font-medium text-sm text-gray-800 truncate">{c.name}</span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isSelected ? 'rotate-90 text-indigo-500' : ''
                    }`}
                  />
                </div>
                {isSelected && (
                  <div className="px-3 pb-4 space-y-3 bg-white border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t.settings.autoCollection.tagDescription}
                    </p>
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={t.settings.autoCollection.addTagPlaceholder}
                      className="h-8 text-sm focus-visible:ring-indigo-500"
                    />
                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {tags.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          {t.settings.autoCollection.noTags}
                        </span>
                      ) : (
                        tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs py-1 px-2.5 bg-gray-100 text-gray-700 rounded-full font-medium"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(c.id, tag)}
                              className="hover:text-red-500 ml-0.5 transition-colors focus:outline-none"
                              aria-label="Remove tag"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {rightCollections.length === 0 && (
            <div className="text-sm text-gray-400 p-2 text-center mt-4">
              {t.settings.autoCollection.noTags}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
