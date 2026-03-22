import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import FavoritesList from '../components/favorites/FavoritesList';
import CollectionSidebar from '../components/favorites/CollectionSidebar';
import { useFavorites } from '../hooks/useFavorites';
import { useCollections, useCollectionItems } from '../hooks/useCollections';
import { useI18n } from '../lib/i18n';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { FavoriteItem } from '../lib/types';

type SortOrder = 'newest' | 'oldest' | 'category' | 'shop';

export default function FavoritesPage() {
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { favorites } = useFavorites();
  const { collections } = useCollections();
  const collectionItemsQuery = useCollectionItems(selectedCollection);
  const { t } = useI18n();

  const baseItems: FavoriteItem[] =
    selectedCollection != null ? (collectionItemsQuery.data ?? []) : favorites;

  const displayItems = useMemo(() => {
    let items = baseItems;
    if (tagFilter.trim()) {
      const q = tagFilter.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.shop_name?.toLowerCase().includes(q) ?? false) ||
          (item.category_name?.toLowerCase().includes(q) ?? false),
      );
    }

    items = [...items];
    if (sortOrder === 'newest') {
      items.sort((a, b) => b.id - a.id);
    } else if (sortOrder === 'oldest') {
      items.sort((a, b) => a.id - b.id);
    } else if (sortOrder === 'category') {
      items.sort((a, b) => (a.category_name || '').localeCompare(b.category_name || ''));
    } else if (sortOrder === 'shop') {
      items.sort((a, b) => (a.shop_name || '').localeCompare(b.shop_name || ''));
    }
    return items;
  }, [tagFilter, baseItems, sortOrder]);

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t.favorites.title}</h2>

        <div className="flex gap-6">
          {/* Sidebar — hidden on small screens */}
          <div className="hidden lg:block sticky top-6 h-[calc(100vh-120px)] overflow-hidden flex flex-col">
            <CollectionSidebar
              selected={selectedCollection}
              onSelect={setSelectedCollection}
              totalCount={favorites.length}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search / filter bar */}
            <div className="mb-4 flex items-center gap-3">
              {/* Collection dropdown for small screens */}
              <div className="lg:hidden">
                <Select
                  value={selectedCollection?.toString() ?? '__all__'}
                  onValueChange={(v) => setSelectedCollection(v === '__all__' ? null : Number(v))}
                >
                  <SelectTrigger className="h-9 w-auto gap-1">
                    <SelectValue />
                    <ChevronDown className="w-3 h-3" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      {t.nav.allCategories} ({favorites.length})
                    </SelectItem>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id.toString()}>
                        {col.name} ({col.item_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder={t.favorites.searchPlaceholder}
                  className="pl-9 h-9"
                />
              </div>
              <div className="shrink-0">
                <Select value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.sort.new}</SelectItem>
                    <SelectItem value="oldest">{t.sort.oldest}</SelectItem>
                    <SelectItem value="category">{t.sort.category}</SelectItem>
                    <SelectItem value="shop">{t.sort.shop}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {t.favorites.countText(displayItems.length)}
              </span>
            </div>

            {['category', 'shop'].includes(sortOrder) ? (
              Object.entries(
                displayItems.reduce(
                  (acc, item) => {
                    const key =
                      sortOrder === 'category'
                        ? item.category_name || t.common.unclassified
                        : item.shop_name || t.common.unclassified;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  },
                  {} as Record<string, typeof displayItems>,
                ),
              ).map(([groupName, groupItems]) => (
                <div key={groupName} className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                    {groupName}{' '}
                    <span className="text-gray-500 text-sm ml-2">({groupItems.length})</span>
                  </h3>
                  <FavoritesList items={groupItems} />
                </div>
              ))
            ) : (
              <FavoritesList items={displayItems} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
