import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFavorites,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  getAutoTagsConfig,
  addToCollection,
} from '../lib/booth-api';
import type { BoothItem, FavoriteItem } from '../lib/types';

export function useFavorites() {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: (): Promise<FavoriteItem[]> => getFavorites(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const favorites = favoritesQuery.data ?? [];

  // O(1) lookup instead of O(n) .some() scan per call
  const favoriteIdSet = useMemo(() => new Set(favorites.map((f) => f.item_id)), [favorites]);

  const addMutation = useMutation({
    mutationFn: async (item: BoothItem) => {
      await addFavoriteApi({
        item_id: item.id,
        name: item.name,
        price: item.price,
        thumbnail_url: item.images[0] || null,
        category_name: item.category_name,
        shop_name: item.shop_name,
      });

      // Handle auto-add by tags
      try {
        const autoTags = await getAutoTagsConfig();
        const promises = [];
        for (const [colIdStr, triggerTags] of Object.entries(autoTags)) {
          if (triggerTags.length > 0 && triggerTags.some((tag) => item.tags.includes(tag))) {
            promises.push(addToCollection(Number(colIdStr), item.id));
          }
        }
        if (promises.length > 0) {
          await Promise.allSettled(promises);
          queryClient.invalidateQueries({ queryKey: ['collections'] });
          queryClient.invalidateQueries({ queryKey: ['collection-items'] });
          queryClient.invalidateQueries({ queryKey: ['item-collections'] });
          queryClient.invalidateQueries({ queryKey: ['all-item-collections-batch'] });
        }
      } catch (err) {
        console.error('Auto-collection add failed:', err);
      }
    },
    onMutate: async (item: BoothItem) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData<FavoriteItem[]>(['favorites']);
      queryClient.setQueryData<FavoriteItem[]>(['favorites'], (old = []) => [
        {
          id: -Date.now(),
          item_id: item.id,
          name: item.name,
          price: item.price,
          thumbnail_url: item.images[0] || null,
          category_name: item.category_name,
          shop_name: item.shop_name,
          added_at: new Date().toISOString(),
          note: null,
        },
        ...old,
      ]);
      return { previous };
    },
    onError: (_err, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await removeFavoriteApi(itemId);
    },
    onMutate: async (itemId: number) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData<FavoriteItem[]>(['favorites']);
      queryClient.setQueryData<FavoriteItem[]>(['favorites'], (old = []) =>
        old.filter((f) => f.item_id !== itemId),
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const isFavorite = useCallback(
    (itemId: number): boolean => favoriteIdSet.has(itemId),
    [favoriteIdSet],
  );

  return {
    favorites,
    isLoading: favoritesQuery.isLoading,
    addFavorite: addMutation.mutateAsync,
    removeFavorite: removeMutation.mutateAsync,
    isFavorite,
  };
}
