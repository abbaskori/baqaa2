import { supabase } from './supabase';
import { type Order, type OrderItem, StorageAPI } from './storage';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  parseISO,
  format,
} from 'date-fns';

export interface OrderFilterOptions {
  page?: number;
  pageSize?: number;
  timeFilter?: 'all' | 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'custom_range';
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string; // 'all' | 'Cash' | 'Online' | 'Swiggy' | 'Zomato'
  search?: string;
  sortBy?: 'createdAt' | 'billNumber' | 'total';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOrdersResult {
  orders: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AnalyticsReportData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  revenueTrend: number;
  ordersTrend: number;
  cashRevenue: number;
  onlineRevenue: number;
  swiggyRevenue: number;
  zomatoRevenue: number;
  cashOrdersCount: number;
  onlineOrdersCount: number;
  swiggyOrdersCount: number;
  zomatoOrdersCount: number;
  hourlyData: { hour: string; revenue: number; orders: number }[];
  dailyTrendData: { date: string; label: string; revenue: number; orders: number }[];
  topItems: { name: string; qty: number; revenue: number; avgPrice: number }[];
  totalDiscounts: number;
  grossRevenue: number;
  discountRate: number;
  topOrders: { billNumber: number; customerName: string; total: number; paymentMethod: string; createdAt: string }[];
}

export function mapDbOrderToOrder(o: any): Order {
  let items: OrderItem[] = [];
  if (Array.isArray(o.items)) {
    items = o.items;
  } else if (typeof o.items === 'string') {
    try {
      items = JSON.parse(o.items);
    } catch {
      items = [];
    }
  }

  return {
    id: o.id,
    billNumber: Number(o.bill_number ?? o.billNumber ?? 0),
    items,
    subtotal: Number(o.subtotal ?? 0),
    discountType: (o.discount_type ?? o.discountType ?? 'none') as Order['discountType'],
    discountValue: Number(o.discount_value ?? o.discountValue ?? 0),
    discountAmount: Number(o.discount_amount ?? o.discountAmount ?? 0),
    total: Number(o.total ?? 0),
    paymentMethod: (o.payment_method ?? o.paymentMethod ?? 'Cash') as Order['paymentMethod'],
    customerName: String(o.customer_name ?? o.customerName ?? ''),
    customerPhone: String(o.customer_phone ?? o.customerPhone ?? ''),
    createdAt: String(o.created_at ?? o.createdAt ?? new Date().toISOString()),
  };
}

export function getDateRangeForFilter(
  timeFilter: 'all' | 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'custom_range',
  selectedDate?: string,
  startDate?: string,
  endDate?: string
): { start?: string; end?: string; prevStart?: string; prevEnd?: string } {
  const now = new Date();
  if (timeFilter === 'daily') {
    const start = startOfDay(now).toISOString();
    const end = endOfDay(now).toISOString();
    const prevDay = subDays(now, 1);
    const prevStart = startOfDay(prevDay).toISOString();
    const prevEnd = endOfDay(prevDay).toISOString();
    return { start, end, prevStart, prevEnd };
  }
  if (timeFilter === 'yesterday') {
    const yesterday = subDays(now, 1);
    const start = startOfDay(yesterday).toISOString();
    const end = endOfDay(yesterday).toISOString();
    const prevDay = subDays(yesterday, 1);
    const prevStart = startOfDay(prevDay).toISOString();
    const prevEnd = endOfDay(prevDay).toISOString();
    return { start, end, prevStart, prevEnd };
  }
  if (timeFilter === 'weekly') {
    const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const end = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const prevWeek = subWeeks(now, 1);
    const prevStart = startOfWeek(prevWeek, { weekStartsOn: 1 }).toISOString();
    const prevEnd = endOfWeek(prevWeek, { weekStartsOn: 1 }).toISOString();
    return { start, end, prevStart, prevEnd };
  }
  if (timeFilter === 'monthly') {
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();
    const prevMonth = subMonths(now, 1);
    const prevStart = startOfMonth(prevMonth).toISOString();
    const prevEnd = endOfMonth(prevMonth).toISOString();
    return { start, end, prevStart, prevEnd };
  }
  if (timeFilter === 'custom' && selectedDate) {
    const date = parseISO(selectedDate);
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();
    const prevDate = subDays(date, 1);
    const prevStart = startOfDay(prevDate).toISOString();
    const prevEnd = endOfDay(prevDate).toISOString();
    return { start, end, prevStart, prevEnd };
  }
  if ((timeFilter === 'custom_range' || (startDate && endDate)) && startDate && endDate) {
    const sDate = parseISO(startDate);
    const eDate = parseISO(endDate);
    const start = startOfDay(sDate).toISOString();
    const end = endOfDay(eDate).toISOString();
    
    // Calculate duration in days for prior period comparison
    const durationMs = Math.max(86400000, endOfDay(eDate).getTime() - startOfDay(sDate).getTime());
    const prevEndObj = new Date(startOfDay(sDate).getTime() - 1);
    const prevStartObj = new Date(prevEndObj.getTime() - durationMs);
    const prevStart = prevStartObj.toISOString();
    const prevEnd = prevEndObj.toISOString();
    return { start, end, prevStart, prevEnd };
  }
  return {};
}

/**
 * Fallback client-side pagination for offline mode when Supabase is not reachable.
 */
function paginateLocalOrders(options: OrderFilterOptions): PaginatedOrdersResult {
  let orders = StorageAPI.getOrders();
  const timeFilter = options.timeFilter || 'all';

  if (timeFilter !== 'all') {
    const { start, end } = getDateRangeForFilter(timeFilter, options.selectedDate, options.startDate, options.endDate);
    if (start && end) {
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      orders = orders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= startMs && t <= endMs;
      });
    }
  }

  if (options.paymentMethod && options.paymentMethod !== 'all') {
    orders = orders.filter(o => o.paymentMethod === options.paymentMethod);
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim().toLowerCase();
    orders = orders.filter(o =>
      String(o.billNumber).includes(term) ||
      (o.customerName || '').toLowerCase().includes(term) ||
      (o.customerPhone || '').includes(term)
    );
  }

  const sortBy = options.sortBy || 'createdAt';
  const asc = options.sortOrder === 'asc';

  orders.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'billNumber') cmp = a.billNumber - b.billNumber;
    else if (sortBy === 'total') cmp = a.total - b.total;
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return asc ? cmp : -cmp;
  });

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);
  const totalCount = orders.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const from = (page - 1) * pageSize;
  const paged = orders.slice(from, from + pageSize);

  return {
    orders: paged,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Server-side paginated orders from Supabase with deterministic sorting and exact count.
 */
export async function fetchPaginatedOrders(options: OrderFilterOptions): Promise<PaginatedOrdersResult> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);
  const timeFilter = options.timeFilter || 'all';
  const paymentMethod = options.paymentMethod || 'all';
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  try {
    let query = supabase.from('orders').select('*', { count: 'exact' });

    // Date range filter
    const { start, end } = getDateRangeForFilter(timeFilter, options.selectedDate, options.startDate, options.endDate);
    if (start && end) {
      query = query.gte('created_at', start).lte('created_at', end);
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    // Search filter across bill_number, customer_name, customer_phone
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      if (/^\d+$/.test(term)) {
        query = query.or(`bill_number.eq.${term},customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      } else {
        query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      }
    }

    // Deterministic sorting with id tiebreaker to prevent skipping/duplicates between pages
    const sortCol = sortBy === 'billNumber' ? 'bill_number' : (sortBy === 'total' ? 'total' : 'created_at');
    const ascending = sortOrder === 'asc';
    query = query.order(sortCol, { ascending });
    query = query.order('id', { ascending });

    // Server-side range pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error('Supabase fetchPaginatedOrders error:', error);
      throw error;
    }

    const orders = (data || []).map(mapDbOrderToOrder);
    const totalCount = count !== null && count !== undefined ? count : orders.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      orders,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (err) {
    console.warn('Supabase query failed, falling back to local storage:', err);
    return paginateLocalOrders(options);
  }
}

/**
 * Fetch all matching orders for a date range in batches of 1,000 without hitting the PostgREST 1000-row cap.
 * Used for accurate analytics calculation.
 */
async function fetchAllSummaryRows(start?: string, end?: string): Promise<any[]> {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let allRows: any[] = [];
  let totalCount = 0;

  while (true) {
    let query = supabase
      .from('orders')
      .select('id,bill_number,subtotal,discount_amount,total,payment_method,created_at,items,customer_name,customer_phone', { count: 'exact' });

    if (start && end) {
      query = query.gte('created_at', start).lte('created_at', end);
    }

    query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
    query = query.range(offset, offset + CHUNK_SIZE - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    if (count !== null && count !== undefined) totalCount = count;

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < CHUNK_SIZE || allRows.length >= totalCount) {
      break;
    }
    offset += CHUNK_SIZE;
  }

  return allRows;
}

/**
 * Computes analytics reports and statistics across all matching orders for the current filter.
 * Batches in chunks of 1000 to bypass PostgREST's 1000-row cap and produce 100% accurate totals.
 */
export async function fetchAnalyticsReport(
  timeFilter: 'all' | 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'custom_range',
  selectedDate?: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsReportData> {
  const { start, end, prevStart, prevEnd } = getDateRangeForFilter(timeFilter, selectedDate, startDate, endDate);

  try {
    // Current period rows
    const currentRows = await fetchAllSummaryRows(start, end);

    // Previous period rows (for trend calculation)
    let prevRows: any[] = [];
    if (timeFilter !== 'all' && prevStart && prevEnd) {
      prevRows = await fetchAllSummaryRows(prevStart, prevEnd);
    }

    const totalOrders = currentRows.length;
    const totalRevenue = currentRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscounts = currentRows.reduce((sum, r) => sum + (Number(r.discount_amount) || 0), 0);
    const grossRevenue = currentRows.reduce((sum, r) => sum + (Number(r.subtotal) || Number(r.total) || 0), 0);
    const discountRate = grossRevenue > 0 ? (totalDiscounts / grossRevenue) * 100 : 0;

    let cashRevenue = 0;
    let onlineRevenue = 0;
    let swiggyRevenue = 0;
    let zomatoRevenue = 0;

    let cashOrdersCount = 0;
    let onlineOrdersCount = 0;
    let swiggyOrdersCount = 0;
    let zomatoOrdersCount = 0;

    const customerOrderCounts: Record<string, number> = {};
    const itemsMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    
    // 24-hour map: hour -> { revenue: number, orders: number }
    const hoursMap: Record<number, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 24; i++) hoursMap[i] = { revenue: 0, orders: 0 };

    // Daily trends map: YYYY-MM-DD -> { revenue: number, orders: number }
    const dailyMap: Record<string, { label: string; revenue: number; orders: number }> = {};

    for (const r of currentRows) {
      const t = Number(r.total) || 0;
      const pm = r.payment_method;
      if (pm === 'Cash') { cashRevenue += t; cashOrdersCount++; }
      else if (pm === 'Online') { onlineRevenue += t; onlineOrdersCount++; }
      else if (pm === 'Swiggy') { swiggyRevenue += t; swiggyOrdersCount++; }
      else if (pm === 'Zomato') { zomatoRevenue += t; zomatoOrdersCount++; }

      const custKey = (r.customer_phone || r.customer_name || '').trim();
      if (custKey) {
        customerOrderCounts[custKey] = (customerOrderCounts[custKey] || 0) + 1;
      }

      if (r.created_at) {
        const dt = new Date(r.created_at);
        const h = dt.getHours();
        hoursMap[h].revenue += t;
        hoursMap[h].orders += 1;

        const dateKey = format(dt, 'yyyy-MM-dd');
        const dateLabel = format(dt, 'MMM dd');
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { label: dateLabel, revenue: 0, orders: 0 };
        }
        dailyMap[dateKey].revenue += t;
        dailyMap[dateKey].orders += 1;
      }

      let parsedItems: any[] = [];
      if (Array.isArray(r.items)) parsedItems = r.items;
      else if (typeof r.items === 'string') {
        try { parsedItems = JSON.parse(r.items); } catch { parsedItems = []; }
      }

      for (const item of parsedItems) {
        if (!item?.name) continue;
        if (!itemsMap[item.name]) {
          itemsMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemsMap[item.name].qty += Number(item.quantity) || 1;
        itemsMap[item.name].revenue += Number(item.amount) || (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }
    }

    const uniqueCustomers = Object.keys(customerOrderCounts).length;
    const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length;
    const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    const hourlyData = Object.entries(hoursMap).map(([hourStr, data]) => {
      const h = parseInt(hourStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return {
        hour: `${h12} ${ampm}`,
        revenue: data.revenue,
        orders: data.orders,
      };
    });

    const dailyTrendData = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, val]) => ({
        date: dateKey,
        label: val.label,
        revenue: val.revenue,
        orders: val.orders,
      }));

    const topItems = Object.values(itemsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map(item => ({
        ...item,
        avgPrice: item.qty > 0 ? item.revenue / item.qty : 0,
      }));

    const topOrders = [...currentRows]
      .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
      .slice(0, 5)
      .map(r => ({
        billNumber: Number(r.bill_number || 0),
        customerName: String(r.customer_name || 'Walk-in Customer'),
        total: Number(r.total || 0),
        paymentMethod: String(r.payment_method || 'Cash'),
        createdAt: String(r.created_at || new Date().toISOString()),
      }));

    // Trends
    const prevRevenue = prevRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const revenueTrend = prevRevenue === 0 ? 0 : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
    const prevOrdersCount = prevRows.length;
    const ordersTrend = prevOrdersCount === 0 ? 0 : ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      uniqueCustomers,
      repeatCustomers,
      repeatRate,
      revenueTrend,
      ordersTrend,
      cashRevenue,
      onlineRevenue,
      swiggyRevenue,
      zomatoRevenue,
      cashOrdersCount,
      onlineOrdersCount,
      swiggyOrdersCount,
      zomatoOrdersCount,
      hourlyData,
      dailyTrendData,
      topItems,
      totalDiscounts,
      grossRevenue,
      discountRate,
      topOrders,
    };
  } catch (err) {
    console.warn('Analytics summary from Supabase failed, calculating from local orders:', err);
    // Offline fallback
    const local = StorageAPI.getOrders();
    const totalOrders = local.length;
    const totalRevenue = local.reduce((sum, o) => sum + o.total, 0);
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
      uniqueCustomers: new Set(local.map(o => o.customerPhone || o.customerName)).size,
      repeatCustomers: 0,
      repeatRate: 0,
      revenueTrend: 0,
      ordersTrend: 0,
      cashRevenue: local.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.total, 0),
      onlineRevenue: local.filter(o => o.paymentMethod === 'Online').reduce((s, o) => s + o.total, 0),
      swiggyRevenue: local.filter(o => o.paymentMethod === 'Swiggy').reduce((s, o) => s + o.total, 0),
      zomatoRevenue: local.filter(o => o.paymentMethod === 'Zomato').reduce((s, o) => s + o.total, 0),
      cashOrdersCount: local.filter(o => o.paymentMethod === 'Cash').length,
      onlineOrdersCount: local.filter(o => o.paymentMethod === 'Online').length,
      swiggyOrdersCount: local.filter(o => o.paymentMethod === 'Swiggy').length,
      zomatoOrdersCount: local.filter(o => o.paymentMethod === 'Zomato').length,
      hourlyData: [],
      dailyTrendData: [],
      topItems: [],
      totalDiscounts: 0,
      grossRevenue: totalRevenue,
      discountRate: 0,
      topOrders: [],
    };
  }
}

/**
 * Downloads matching orders as CSV on demand.
 * Paginates through all matching records in batches of 1,000 so orders beyond row 1,000 are not cut off.
 */
export async function exportFilteredOrdersToCSV(
  options: Omit<OrderFilterOptions, 'page' | 'pageSize'>,
  onProgress?: (fetched: number, total: number) => void
): Promise<number> {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let allOrders: Order[] = [];
  let totalCount = 0;

  const { start, end } = getDateRangeForFilter(options.timeFilter || 'all', options.selectedDate, options.startDate, options.endDate);

  try {
    while (true) {
      let query = supabase.from('orders').select('*', { count: 'exact' });

      if (start && end) {
        query = query.gte('created_at', start).lte('created_at', end);
      }
      if (options.paymentMethod && options.paymentMethod !== 'all') {
        query = query.eq('payment_method', options.paymentMethod);
      }
      if (options.search && options.search.trim()) {
        const term = options.search.trim();
        if (/^\d+$/.test(term)) {
          query = query.or(`bill_number.eq.${term},customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
        } else {
          query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
        }
      }

      query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      query = query.range(offset, offset + CHUNK_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      if (count !== null && count !== undefined) totalCount = count;

      const mapped = (data || []).map(mapDbOrderToOrder);
      allOrders = allOrders.concat(mapped);

      if (onProgress) {
        onProgress(allOrders.length, totalCount);
      }

      if (mapped.length < CHUNK_SIZE || allOrders.length >= totalCount) {
        break;
      }
      offset += CHUNK_SIZE;
    }
  } catch (err) {
    console.warn('Cloud CSV export failed, exporting local orders:', err);
    allOrders = StorageAPI.getOrders();
  }

  const headers = "Bill No,Date,Customer,Phone,Items,Subtotal,Discount,Total,Payment\n";
  const rows = allOrders.map(o => {
    const formattedDate = format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm');
    const itemsStr = o.items.map(i => `${i.quantity}x ${i.name}`).join('; ');
    const safeCust = (o.customerName || '').replace(/"/g, '""');
    const safePhone = o.customerPhone || '';
    const safeItems = itemsStr.replace(/"/g, '""');
    return `${o.billNumber},${formattedDate},"${safeCust}","${safePhone}","${safeItems}",${o.subtotal},${o.discountAmount},${o.total},${o.paymentMethod}`;
  }).join("\n");

  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filterLabel = options.timeFilter || 'all';
  link.setAttribute('download', `baqaa_export_${filterLabel}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return allOrders.length;
}
