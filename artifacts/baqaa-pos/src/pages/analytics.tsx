import { useState, useMemo, useEffect, useCallback } from "react";
import { useOrders, useCategories } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";
import { StorageAPI, type Order, type OrderItem } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns";
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Users,
  AlertTriangle,
  Clock,
  Award,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
  RefreshCw,
  Filter,
  Calendar,
  Percent,
  Trash2,
  BarChart3,
  Flame,
} from "lucide-react";
import { motion } from "framer-motion";

// ==========================================
// Types & Interfaces
// ==========================================
type TimeFilterType = 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'custom_range' | 'all';
type TabType = 'overview' | 'hourly' | 'payment' | 'items' | 'orders';

interface OrderFilterOptions {
  page?: number;
  pageSize?: number;
  timeFilter?: TimeFilterType;
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string; // 'all' | 'Cash' | 'Online' | 'Swiggy' | 'Zomato'
  search?: string;
  sortBy?: 'createdAt' | 'billNumber' | 'total';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedOrdersResult {
  orders: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface AnalyticsReportData {
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

// ==========================================
// Helper Functions & DB Mappers
// ==========================================
function mapDbOrderToOrder(o: any): Order {
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

function getDateRangeForFilter(
  timeFilter: TimeFilterType,
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
    const durationMs = Math.max(86400000, endOfDay(eDate).getTime() - startOfDay(sDate).getTime());
    const prevEndObj = new Date(startOfDay(sDate).getTime() - 1);
    const prevStartObj = new Date(prevEndObj.getTime() - durationMs);
    const prevStart = prevStartObj.toISOString();
    const prevEnd = prevEndObj.toISOString();
    return { start, end, prevStart, prevEnd };
  }
  return {};
}

function paginateLocalOrders(options: OrderFilterOptions): PaginatedOrdersResult {
  // Cloud-first: no local fallback
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);
  return { orders: [], totalCount: 0, page, pageSize, totalPages: 1, hasNextPage: false, hasPrevPage: false };
}

async function fetchPaginatedOrders(options: OrderFilterOptions): Promise<PaginatedOrdersResult> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);
  const timeFilter = options.timeFilter || 'all';
  const paymentMethod = options.paymentMethod || 'all';
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  try {
    let query = supabase.from('orders').select('*', { count: 'exact' });

    const { start, end } = getDateRangeForFilter(timeFilter, options.selectedDate, options.startDate, options.endDate);
    if (start && end) {
      query = query.gte('created_at', start).lte('created_at', end);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      if (/^\d+$/.test(term)) {
        query = query.or(`bill_number.eq.${term},customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      } else {
        query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      }
    }

    const sortCol = sortBy === 'billNumber' ? 'bill_number' : (sortBy === 'total' ? 'total' : 'created_at');
    const ascending = sortOrder === 'asc';
    query = query.order(sortCol, { ascending });
    query = query.order('id', { ascending });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

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
    if (rows.length === 0) break;
    allRows = allRows.concat(rows);

    // Stop if we got fewer rows than the chunk size (last page)
    if (rows.length < CHUNK_SIZE) break;
    // Stop if totalCount is known and we've fetched everything
    if (totalCount > 0 && allRows.length >= totalCount) break;
    offset += CHUNK_SIZE;
  }

  return allRows;
}

async function fetchAnalyticsReport(
  timeFilter: TimeFilterType,
  selectedDate?: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsReportData> {
  const { start, end, prevStart, prevEnd } = getDateRangeForFilter(timeFilter, selectedDate, startDate, endDate);

  try {
    const currentRows = await fetchAllSummaryRows(start, end);

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
    const hoursMap: Record<number, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 24; i++) hoursMap[i] = { revenue: 0, orders: 0 };

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
    console.warn('Analytics summary from Supabase failed:', err);
    return {
      totalOrders: 0, totalRevenue: 0, avgOrderValue: 0,
      uniqueCustomers: 0, repeatCustomers: 0, repeatRate: 0,
      revenueTrend: 0, ordersTrend: 0,
      cashRevenue: 0, onlineRevenue: 0, swiggyRevenue: 0, zomatoRevenue: 0,
      cashOrdersCount: 0, onlineOrdersCount: 0, swiggyOrdersCount: 0, zomatoOrdersCount: 0,
      hourlyData: [], dailyTrendData: [], topItems: [],
      totalDiscounts: 0, grossRevenue: 0, discountRate: 0, topOrders: [],
    };
  }
}

async function exportFilteredOrdersToCSV(
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
      if (mapped.length === 0) break;
      allOrders = allOrders.concat(mapped);

      if (onProgress) {
        onProgress(allOrders.length, totalCount);
      }

      if (mapped.length < CHUNK_SIZE) break;
      if (totalCount > 0 && allOrders.length >= totalCount) break;
      offset += CHUNK_SIZE;
    }
  } catch (err) {
    console.warn('Cloud CSV export failed:', err);
    allOrders = [];
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

// ==========================================
// Custom React Hooks
// ==========================================
function usePaginatedOrders(options: OrderFilterOptions) {
  const [data, setData] = useState<PaginatedOrdersResult>({
    orders: [],
    totalCount: 0,
    page: options.page || 1,
    pageSize: options.pageSize || 20,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPaginatedOrders(options);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load paginated orders:', err);
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [
    options.page,
    options.pageSize,
    options.timeFilter,
    options.selectedDate,
    options.startDate,
    options.endDate,
    options.paymentMethod,
    options.search,
    options.sortBy,
    options.sortOrder,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchOrders();
    };
    window.addEventListener('baqaa_storage_update', handleUpdate);
    return () => window.removeEventListener('baqaa_storage_update', handleUpdate);
  }, [fetchOrders]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchOrders,
  };
}

function useOrderAnalytics(
  timeFilter: TimeFilterType,
  selectedDate?: string,
  startDate?: string,
  endDate?: string
) {
  const [stats, setStats] = useState<AnalyticsReportData>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    uniqueCustomers: 0,
    repeatCustomers: 0,
    repeatRate: 0,
    revenueTrend: 0,
    ordersTrend: 0,
    cashRevenue: 0,
    onlineRevenue: 0,
    swiggyRevenue: 0,
    zomatoRevenue: 0,
    cashOrdersCount: 0,
    onlineOrdersCount: 0,
    swiggyOrdersCount: 0,
    zomatoOrdersCount: 0,
    hourlyData: [],
    dailyTrendData: [],
    topItems: [],
    totalDiscounts: 0,
    grossRevenue: 0,
    discountRate: 0,
    topOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalyticsReport(timeFilter, selectedDate, startDate, endDate);
      setStats(res);
    } catch (err: any) {
      console.error('Failed to load analytics stats:', err);
      setError(err?.message || 'Failed to calculate analytics');
    } finally {
      setLoading(false);
    }
  }, [timeFilter, selectedDate, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchStats();
    };
    window.addEventListener('baqaa_storage_update', handleUpdate);
    return () => window.removeEventListener('baqaa_storage_update', handleUpdate);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// ==========================================
// Main Analytics Dashboard Page
// ==========================================
export default function Analytics() {
  const { deleteOrder, resetData } = useOrders();
  const { data: categories } = useCategories();

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Table-specific filters & pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'createdAt' | 'billNumber' | 'total'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // CSV export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [timeFilter, selectedDate, startDate, endDate, debouncedSearch, paymentFilter, pageSize]);

  // Server-side paginated orders for the table
  const {
    orders,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    loading: tableLoading,
    refetch: refetchTable,
  } = usePaginatedOrders({
    page,
    pageSize,
    timeFilter,
    selectedDate,
    startDate,
    endDate,
    paymentMethod: paymentFilter,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  // Server-side analytics calculation across all matching orders
  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useOrderAnalytics(timeFilter, selectedDate, startDate, endDate);

  const pieData = useMemo(() => [
    { name: 'Cash', value: stats.cashRevenue, count: stats.cashOrdersCount, color: '#f97316' },
    { name: 'Online', value: stats.onlineRevenue, count: stats.onlineOrdersCount, color: '#ec4899' },
    { name: 'Swiggy', value: stats.swiggyRevenue, count: stats.swiggyOrdersCount, color: '#fc8019' },
    { name: 'Zomato', value: stats.zomatoRevenue, count: stats.zomatoOrdersCount, color: '#cb202d' },
  ].filter(d => d.value > 0), [stats]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      setExportProgress(null);
      await exportFilteredOrdersToCSV(
        {
          timeFilter,
          selectedDate,
          startDate,
          endDate,
          paymentMethod: paymentFilter,
          search: debouncedSearch,
          sortBy,
          sortOrder,
        },
        (current, total) => {
          setExportProgress({ current, total });
        }
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export orders. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleReset = () => {
    if (window.confirm("WARNING: This will delete ALL orders and customer data permanently. Are you sure?")) {
      if (window.prompt("Type 'DELETE' to confirm") === "DELETE") {
        resetData();
        refetchTable();
        refetchStats();
      }
    }
  };

  const handleDeleteOrder = async (id: string, billNumber: number) => {
    if (window.confirm(`Are you sure you want to delete Bill #${billNumber}? This cannot be undone.`)) {
      await deleteOrder(id);
      refetchTable();
      refetchStats();
    }
  };

  // Preset helper buttons
  const applyPreset = (preset: TimeFilterType) => {
    setTimeFilter(preset);
    if (preset === 'daily') {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (preset === 'yesterday') {
      setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    } else if (preset === 'custom_range') {
      setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  // Generate page numbers for pagination controls
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 relative p-4 md:p-8">
      <img
        src={`${import.meta.env.BASE_URL}images/analytics-bg.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none mix-blend-overlay"
        alt=""
      />

      <div className="max-w-[1600px] mx-auto relative z-10 space-y-6 md:space-y-8">
        
        {/* Header Title & Date Range Controls */}
        <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-purple-500/5 border border-border/60 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-black text-foreground">Analytics Dashboard</h1>
                  <p className="text-muted-foreground text-xs font-semibold mt-0.5">
                    Real-time sales, data-range insights, peak hours & order analytics across <span className="text-primary font-bold">{stats.totalOrders.toLocaleString()}</span> total orders.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <button
                onClick={() => { refetchStats(); refetchTable(); }}
                className="p-2.5 bg-white dark:bg-card border border-border rounded-xl shadow-sm text-foreground hover:bg-muted transition-all"
                title="Refresh Analytics"
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading || tableLoading ? 'animate-spin text-primary' : ''}`} />
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-4 py-2.5 bg-white dark:bg-card text-foreground border border-border rounded-xl font-bold text-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>
                      Exporting {exportProgress ? `(${exportProgress.current}/${exportProgress.total})` : "..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-primary" /> Export CSV
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300 rounded-xl font-bold text-xs hover:bg-red-200 transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Time Span Filter Toolbar */}
          <div className="pt-3 border-t border-border/50 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Time Span:
              </span>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as TimeFilterType)}
                className="px-4 py-2 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-xs text-foreground cursor-pointer"
              >
                <option value="all">♾️ All Time</option>
                <option value="daily">📅 Today</option>
                <option value="yesterday">⏪ Yesterday</option>
                <option value="weekly">🗓️ This Week</option>
                <option value="monthly">🗓️ This Month</option>
                <option value="custom">📆 Single Specific Day</option>
                <option value="custom_range">🎯 Custom Date Range (From - To)</option>
              </select>

              {/* Single Day Picker */}
              {timeFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none font-bold text-xs text-foreground"
                  />
                </div>
              )}

              {/* Custom Date Range Pickers (From Date to To Date) */}
              {timeFilter === 'custom_range' && (
                <div className="flex items-center gap-2 flex-wrap bg-primary/5 p-1.5 rounded-2xl border border-primary/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-primary pl-1">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none font-bold text-xs text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-primary">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none font-bold text-xs text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => applyPreset('daily')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${timeFilter === 'daily' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
              >
                Today
              </button>
              <button
                onClick={() => applyPreset('weekly')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${timeFilter === 'weekly' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => applyPreset('monthly')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${timeFilter === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
              >
                This Month
              </button>
              <button
                onClick={() => applyPreset('custom_range')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${timeFilter === 'custom_range' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
              >
                Date Range
              </button>
            </div>
          </div>
        </div>

        {/* Key KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp className="text-green-500 w-6 h-6" />}
            color="bg-green-50 dark:bg-green-950/40"
            trend={stats.revenueTrend}
            subtitle={stats.totalOrders > 0 ? `Net from ${stats.totalOrders} bills` : 'No orders in range'}
            loading={statsLoading}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            icon={<Banknote className="text-blue-500 w-6 h-6" />}
            color="bg-blue-50 dark:bg-blue-950/40"
            trend={stats.ordersTrend}
            subtitle={stats.totalOrders > 0 ? `Avg ${formatCurrency(stats.avgOrderValue)} / bill` : ''}
            loading={statsLoading}
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(stats.avgOrderValue)}
            icon={<Award className="text-purple-500 w-6 h-6" />}
            color="bg-purple-50 dark:bg-purple-950/40"
            subtitle="Ticket Size per order"
            loading={statsLoading}
          />
          <StatCard
            title="Repeat Customer Rate"
            value={`${stats.repeatRate.toFixed(1)}%`}
            icon={<Users className="text-pink-500 w-6 h-6" />}
            color="bg-pink-50 dark:bg-pink-950/40"
            subtitle={`${stats.uniqueCustomers} unique customer phone(s)`}
            loading={statsLoading}
          />
          <StatCard
            title="Total Discounts"
            value={formatCurrency(stats.totalDiscounts)}
            icon={<Percent className="text-amber-500 w-6 h-6" />}
            color="bg-amber-50 dark:bg-amber-950/40"
            subtitle={`${stats.discountRate.toFixed(1)}% of gross sales`}
            loading={statsLoading}
          />
        </div>

        {/* Analytics Tabs Navigation */}
        <div className="flex border-b border-border/80 gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'overview', label: '📊 Overview & Daily Trends', icon: TrendingUp },
            { id: 'hourly', label: '⏰ Peak Hours', icon: Clock },
            { id: 'payment', label: '💳 Payment Breakdown', icon: CreditCard },
            { id: 'items', label: '🍔 Top Menu Items', icon: Star },
            { id: 'orders', label: '📋 Order History Table', icon: Filter },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-5 py-3 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                    : 'bg-white/60 dark:bg-card/60 hover:bg-white dark:hover:bg-card text-muted-foreground hover:text-foreground border border-border/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Daily Trends Chart */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Sales Trend Timeline Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-card p-6 rounded-3xl shadow-xl shadow-black/5 border border-border/50">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black font-display text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" /> Daily Revenue & Order Timeline
                    </h3>
                    <p className="text-xs text-muted-foreground">Revenue trajectory day-by-day across selected period</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-primary">
                      <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Revenue (₹)
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> Orders Count
                    </span>
                  </div>
                </div>

                <div className="h-[320px] w-full">
                  {stats.dailyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stats.dailyTrendData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#888888" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#888888" fontSize={11} tickFormatter={v => `₹${v}`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={11} />
                        <RechartsTooltip
                          formatter={(val: any, name: string) => [
                            name === 'revenue' ? formatCurrency(val) : val,
                            name === 'revenue' ? 'Revenue' : 'Orders'
                          ]}
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '1rem', border: 'none' }}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#c084fc" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
                      No order timeline data available for this range
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary & High Value Orders */}
              <div className="space-y-6">
                {/* Gross vs Net Card */}
                <div className="bg-white dark:bg-card p-6 rounded-3xl shadow-xl shadow-black/5 border border-border/50">
                  <h3 className="text-base font-black font-display text-foreground mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-500" /> Revenue & Discount Breakdown
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-border/40">
                      <span className="text-muted-foreground font-semibold">Gross Subtotal:</span>
                      <span className="font-bold text-foreground">{formatCurrency(stats.grossRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/40">
                      <span className="text-muted-foreground font-semibold">Total Discounts Given:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">- {formatCurrency(stats.totalDiscounts)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/40">
                      <span className="text-muted-foreground font-semibold">Net Collection:</span>
                      <span className="font-black text-green-600 dark:text-green-400 text-lg">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground font-semibold">Discount Impact Rate:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{stats.discountRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Top 5 High Value Orders */}
                <div className="bg-white dark:bg-card p-6 rounded-3xl shadow-xl shadow-black/5 border border-border/50">
                  <h3 className="text-base font-black font-display text-foreground mb-4 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" /> Highest Value Orders
                  </h3>
                  <div className="space-y-2">
                    {stats.topOrders.length > 0 ? (
                      stats.topOrders.map(o => (
                        <div key={o.billNumber} className="flex justify-between items-center p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-all">
                          <div>
                            <p className="font-bold text-xs text-foreground">Bill #{o.billNumber} - {o.customerName}</p>
                            <p className="text-[10px] text-muted-foreground">{o.paymentMethod} • {format(new Date(o.createdAt), 'dd MMM hh:mm a')}</p>
                          </div>
                          <span className="font-black text-sm text-primary">{formatCurrency(o.total)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No top orders recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Peak Operating Hours */}
        {activeTab === 'hourly' && (
          <div className="bg-white dark:bg-card p-6 md:p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50 space-y-6">
            <div>
              <h3 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" /> Hourly Sales & Order Density (24-Hour Distribution)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Discover peak revenue hours to optimize kitchen staffing, food preparation, and delivery operations.
              </p>
            </div>

            <div className="h-[380px] w-full">
              {stats.hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={11} tickFormatter={v => `₹${v}`} />
                    <RechartsTooltip
                      formatter={(val: any, name: string) => [
                        name === 'revenue' ? formatCurrency(val) : `${val} orders`,
                        name === 'revenue' ? 'Hourly Revenue' : 'Orders Count'
                      ]}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '1rem', border: 'none' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No hourly data recorded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Payment Method Breakdown */}
        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="bg-white dark:bg-card p-6 md:p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50">
              <h3 className="text-lg font-black font-display text-foreground mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-500" /> Revenue Distribution by Payment Method
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Percentage share of Cash, Online, Swiggy, and Zomato sales</p>

              <div className="h-[300px] w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No payment data recorded
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="space-y-4">
              {[
                { name: 'Cash', revenue: stats.cashRevenue, count: stats.cashOrdersCount, color: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
                { name: 'Online (UPI/QR)', revenue: stats.onlineRevenue, count: stats.onlineOrdersCount, color: 'bg-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
                { name: 'Swiggy', revenue: stats.swiggyRevenue, count: stats.swiggyOrdersCount, color: 'bg-[#fc8019]', bg: 'bg-orange-50/50 dark:bg-orange-950/20' },
                { name: 'Zomato', revenue: stats.zomatoRevenue, count: stats.zomatoOrdersCount, color: 'bg-[#cb202d]', bg: 'bg-red-50/50 dark:bg-red-950/20' },
              ].map(pm => {
                const pct = stats.totalRevenue > 0 ? (pm.revenue / stats.totalRevenue) * 100 : 0;
                return (
                  <div key={pm.name} className={`${pm.bg} p-5 rounded-3xl border border-border/50 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${pm.color}`} />
                      <div>
                        <p className="font-bold text-sm text-foreground">{pm.name}</p>
                        <p className="text-xs text-muted-foreground">{pm.count} orders ({pct.toFixed(1)}% of total)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-foreground">{formatCurrency(pm.revenue)}</p>
                      <p className="text-[11px] text-muted-foreground">Avg: {pm.count > 0 ? formatCurrency(pm.revenue / pm.count) : '₹0'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Top Selling Food Items */}
        {activeTab === 'items' && (
          <div className="bg-white dark:bg-card p-6 md:p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50 space-y-6">
            <div>
              <h3 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" /> Top 10 Best Selling Items
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Rankings by total quantity ordered and revenue generated across selected time span.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Horizontal Bar Chart */}
              <div className="h-[360px] w-full">
                {stats.topItems.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stats.topItems}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" fontSize={11} stroke="#888888" />
                      <YAxis dataKey="name" type="category" width={140} fontSize={11} stroke="#888888" />
                      <RechartsTooltip formatter={(val: number, name: string) => [name === 'qty' ? `${val} sold` : formatCurrency(val), name === 'qty' ? 'Quantity' : 'Revenue']} />
                      <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No item performance data available
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center">Qty Sold</th>
                      <th className="py-2.5 px-3 text-right">Revenue</th>
                      <th className="py-2.5 px-3 text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-semibold">
                    {stats.topItems.map((item, idx) => (
                      <tr key={item.name} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-black text-primary">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-3 text-center text-foreground font-black">{item.qty}</td>
                        <td className="py-3 px-3 text-right font-black text-green-600 dark:text-green-400">{formatCurrency(item.revenue)}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{formatCurrency(item.avgPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5 / Always visible Order History Table */}
        {(activeTab === 'orders' || activeTab === 'overview') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" /> Full Order History & Transactions
                </h2>
                <p className="text-xs text-muted-foreground">View, search, sort, and inspect all {totalCount.toLocaleString()} matching orders with server-side pagination.</p>
              </div>
            </div>

            {/* Order History Table Container */}
            <div className="bg-white dark:bg-card rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-4 md:p-6 space-y-4">
              
              {/* Table Filter Controls Header */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Search input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by Bill #, Customer name, Phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Payment filter & sort controls */}
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-muted-foreground">Payment:</span>
                    <select
                      value={paymentFilter}
                      onChange={e => setPaymentFilter(e.target.value)}
                      className="px-3 py-1.5 bg-muted/40 border border-border rounded-xl font-bold text-xs text-foreground cursor-pointer"
                    >
                      <option value="all">All Methods</option>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Swiggy">Swiggy</option>
                      <option value="Zomato">Zomato</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-muted-foreground">Sort By:</span>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="px-3 py-1.5 bg-muted/40 border border-border rounded-xl font-bold text-xs text-foreground cursor-pointer"
                    >
                      <option value="createdAt">Date / Time</option>
                      <option value="billNumber">Bill Number</option>
                      <option value="total">Order Amount</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
                      className="p-1.5 bg-muted/40 border border-border rounded-xl text-foreground font-bold text-xs hover:bg-muted transition-colors"
                      title={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
                    >
                      {sortOrder === 'desc' ? '⬇️' : '⬆️'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Structure */}
              <div className="overflow-x-auto relative">
                {tableLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-foreground"
                        onClick={() => {
                          if (sortBy === 'billNumber') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('billNumber'); setSortOrder('desc'); }
                        }}
                      >
                        Bill # {sortBy === 'billNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-foreground"
                        onClick={() => {
                          if (sortBy === 'createdAt') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('createdAt'); setSortOrder('desc'); }
                        }}
                      >
                        Date & Time {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th
                        className="py-3 px-4 text-right cursor-pointer hover:text-foreground"
                        onClick={() => {
                          if (sortBy === 'total') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('total'); setSortOrder('desc'); }
                        }}
                      >
                        Amount {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-3 px-4 text-center">Method</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.length === 0 && !tableLoading && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Filter className="w-8 h-8 text-muted-foreground/40" />
                            <p className="font-semibold text-foreground">No orders match the selected filters</p>
                            <p className="text-xs">Try clearing search or choosing a different date range</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-muted/40 transition-colors text-foreground group">
                        <td className="py-3 px-4 font-bold text-primary">#{o.billNumber}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {format(new Date(o.createdAt), "dd MMM yyyy, hh:mm a")}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-xs">{o.customerName || "Walk-in Guest"}</p>
                          {o.customerPhone && (
                            <p className="text-[11px] text-muted-foreground">{o.customerPhone}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-[240px] truncate" title={o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                          {o.items.length > 0
                            ? o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
                            : "Custom Bill"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm text-foreground">
                          {formatCurrency(o.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              o.paymentMethod === 'Cash'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                                : o.paymentMethod === 'Online'
                                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'
                                : o.paymentMethod === 'Swiggy'
                                ? 'bg-[#fc8019]/20 text-[#fc8019]'
                                : 'bg-[#cb202d]/20 text-[#cb202d]'
                            }`}
                          >
                            {o.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteOrder(o.id, o.billNumber)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">
                  {totalCount > 0 ? (
                    <>
                      Showing <span className="font-bold text-primary">{(page - 1) * pageSize + 1}</span>–
                      <span className="font-bold text-primary">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                      <span className="font-bold text-primary">{totalCount.toLocaleString()}</span> orders
                    </>
                  ) : (
                    "0 orders found"
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-[11px]">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 bg-muted/40 border border-border rounded-lg text-foreground font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setPage(1)}
                    disabled={!hasPrevPage || tableLoading}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrevPage || tableLoading}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {pageNumbers.map((p, idx) =>
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          onClick={() => setPage(Number(p))}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            page === p
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage || tableLoading}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={!hasNextPage || tableLoading}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, subtitle, loading }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-card p-5 rounded-3xl shadow-lg shadow-black/5 border border-border/50 flex items-center gap-4 relative overflow-hidden"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          {loading ? (
            <div className="h-7 w-20 bg-muted/60 animate-pulse rounded-lg mt-1" />
          ) : (
            <p className="text-xl sm:text-2xl font-black font-display mt-0.5 text-foreground">
              {value}
            </p>
          )}
          {trend !== undefined && trend !== 0 && !loading && (
            <div
              className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(trend).toFixed(0)}%
            </div>
          )}
        </div>
        {subtitle && <p className="text-[10px] font-bold text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
