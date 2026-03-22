import { useMemo, useState } from 'react';
import { FolderPlus, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import type { Collection } from '../../lib/types';
import { useI18n } from '../../lib/i18n';

interface Props {
  itemId: number;
  collections: Collection[];
  memberCollectionIds: number[];
  onAddToCollection: (params: { collectionId: number; itemId: number }) => Promise<void>;
  onRemoveFromCollection: (params: { collectionId: number; itemId: number }) => Promise<void>;
}

export default function AddToCollectionMenu({
  itemId,
  collections,
  memberCollectionIds,
  onAddToCollection,
  onRemoveFromCollection,
}: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const memberOf = useMemo(() => new Set(memberCollectionIds), [memberCollectionIds]);

  const filteredCollections = useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.trim().toLowerCase();
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, search]);

  const toggle = async (collectionId: number) => {
    try {
      if (memberOf.has(collectionId)) {
        await onRemoveFromCollection({ collectionId, itemId });
      } else {
        await onAddToCollection({ collectionId, itemId });
      }
    } catch (e) {
      console.error('Toggle collection failed:', e);
      toast.error(t.errors.collectionToggle);
    }
  };

  if (collections.length === 0) return null;

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <FolderPlus className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t.collections.addToCollection}</TooltipContent>
        <DropdownMenuContent align="end" className="w-[200px] flex flex-col p-1">
          <div className="pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input
                autoFocus
                type="text"
                placeholder={t.collections.namePlaceholder || 'Search...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="pl-7 h-7 text-xs border-none shadow-none focus-visible:ring-1"
              />
            </div>
          </div>
          <DropdownMenuGroup className="max-h-[200px] overflow-y-auto">
            {filteredCollections.length > 0 ? (
              filteredCollections.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={(e) => {
                    e.preventDefault(); // prevent closing menu easily so user can toggle multiple
                    toggle(col.id);
                  }}
                  className={cn(
                    'flex items-center gap-2 text-xs py-1.5 cursor-pointer',
                    memberOf.has(col.id) && 'text-indigo-700 bg-indigo-50/50',
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="truncate flex-1">{col.name}</span>
                  {memberOf.has(col.id) && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-xs text-gray-400">
                {t.collections.emptyList || 'No results'}
              </div>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}
