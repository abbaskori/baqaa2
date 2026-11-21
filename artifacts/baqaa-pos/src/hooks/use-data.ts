import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageAPI, type ShopInfo, type Category, type MenuItem, type Order, type Customer, type SecuritySettings } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────
// Generic async data hook with realtime refresh
// ─────────────────────────────────────────────
function useCloudData<T>(
  fetcher: () => Promise<T>,
  defaultValue: T,
  realtimeTables?: string[]
) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      console.error('Cloud fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Listen for manual emit
    const handleUpdate = () => refresh();
    window.addEventListener('baqaa_storage_update', handleUpdate);

    // Realtime subscriptions
    const channels: ReturnType<typeof supabase.channel>[] = [];
    if (realtimeTables && realtimeTables.length > 0) {
      realtimeTables.forEach(table => {
        const ch = supabase
          .channel(`${table}_changes_${Math.random()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => refresh())
          .subscribe();
        channels.push(ch);
      });
    }

    return () => {
      window.removeEventListener('baqaa_storage_update', handleUpdate);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [refresh]);

  return { data, loading, refresh };
}

// ─────────────────────────────────────────────
// Category rank for display ordering
// ─────────────────────────────────────────────
export function getCategoryRank(rawName: string): number {
  const name = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (name.includes('starter')) return 1;
  if (name.includes('burger')) return 2;
  if (name.includes('frie') || name.includes('fry')) return 3;
  if (name.includes('wrap')) return 4;
  if (name.includes('sizzler')) return 5;
  if (name.includes('beverage') || name.includes('mocktail')) return 6;
  if (name.includes('nonveg') && name.includes('pizza')) return 8;
  if (name.includes('vegpizza') || (name.includes('veg') && name.includes('pizza'))) return 7;
  if (name.includes('pizza')) return 8;
  if (name.includes('nonveg') && (name.includes('sandwich') || name.includes('club'))) return 10;
  if (name.includes('vegsandwich') || name.includes('vegclub') || (name.includes('veg') && (name.includes('sandwich') || name.includes('club')))) return 9;
  if (name.includes('sandwich') || name.includes('club')) return 10;
  if (name.includes('combo')) return 11;
  if (name.includes('addon') || name.includes('add')) return 12;
  if (name.includes('colddrink') || name.includes('drink')) return 13;
  return 999;
}

export function sortCategories<T extends { name: string }>(categories: T[]): T[] {
  if (!categories) return [];
  return [...categories].sort((a, b) => getCategoryRank(a.name) - getCategoryRank(b.name));
}

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────
export function useShopInfo() {
  const { data, loading, refresh } = useCloudData(
    StorageAPI.getShopInfo,
    { name: 'Baqaa Fast Food', address: '', contact: '', gstin: '', logo: '' } as ShopInfo,
    ['shop_info']
  );
  const update = useCallback(async (info: ShopInfo) => {
    await StorageAPI.setShopInfo(info);
    refresh();
  }, [refresh]);
  return { data, loading, update };
}

export function useCategories() {
  const { data: raw, loading, refresh } = useCloudData(
    StorageAPI.getCategories,
    [] as Category[],
    ['categories']
  );
  const categories = sortCategories(raw);

  const addCategory = useCallback(async (name: string) => {
    await StorageAPI.addCategory(name);
    refresh();
  }, [refresh]);

  const deleteCategory = useCallback(async (id: string) => {
    await StorageAPI.deleteCategory(id);
    refresh();
  }, [refresh]);

  return { data: categories, loading, addCategory, deleteCategory };
}

export function useMenuItems() {
  const { data: items, loading, refresh } = useCloudData(
    StorageAPI.getMenuItems,
    [] as MenuItem[],
    ['menu_items']
  );

  const addItem = useCallback(async (item: Omit<MenuItem, 'id' | 'createdAt'>) => {
    await StorageAPI.addMenuItem(item);
    refresh();
  }, [refresh]);

  const updateItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    await StorageAPI.updateMenuItem(id, updates);
    refresh();
  }, [refresh]);

  const deleteItem = useCallback(async (id: string) => {
    await StorageAPI.deleteMenuItem(id);
    refresh();
  }, [refresh]);

  return { data: items, loading, addItem, updateItem, deleteItem };
}

export function useOrders() {
  const { data: orders, loading, refresh } = useCloudData(
    () => StorageAPI.getOrders(100),
    [] as Order[],
    ['orders']
  );

  const createOrder = useCallback(async (orderData: Omit<Order, 'id' | 'billNumber'>) => {
    const result = await StorageAPI.addOrder(orderData);
    refresh();
    return result;
  }, [refresh]);

  const updateOrder = useCallback(async (id: string, updates: Omit<Order, 'id' | 'billNumber'>) => {
    const result = await StorageAPI.updateOrder(id, updates);
    refresh();
    return result;
  }, [refresh]);

  const deleteOrder = useCallback(async (id: string) => {
    await StorageAPI.deleteOrder(id);
    refresh();
  }, [refresh]);

  const resetData = useCallback(async () => {
    await StorageAPI.resetData();
    refresh();
  }, [refresh]);

  return { data: orders, loading, createOrder, updateOrder, deleteOrder, resetData };
}

export function useCustomers() {
  const { data, loading, refresh } = useCloudData(
    StorageAPI.getCustomers,
    [] as Customer[],
    ['customers']
  );
  return { data, loading, refresh };
}

export function useSecuritySettings() {
  const { data, loading, refresh } = useCloudData(
    StorageAPI.getSecuritySettings,
    { adminPin: '0000', staffPin: '1234', managerPin: '5555' } as SecuritySettings,
    ['security_settings']
  );
  const update = useCallback(async (settings: SecuritySettings) => {
    await StorageAPI.setSecuritySettings(settings);
    refresh();
  }, [refresh]);
  return { data, loading, update };
}

// Legacy paginated / analytics hooks used by analytics.tsx
// These are thin wrappers — analytics.tsx has its own Supabase logic embedded
export function usePaginatedOrders(options: any) {
  return { orders: [], totalCount: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false, loading: false, refetch: () => {} };
}

export function useOrderAnalytics(timeFilter: any, selectedDate: any, startDate: any, endDate: any) {
  return { stats: {}, loading: false, refetch: () => {} };
}
