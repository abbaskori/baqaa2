import { useState, useMemo, useEffect } from "react";
import { useOrders, useCategories, usePaginatedOrders, useOrderAnalytics } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";
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
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
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
  ShoppingBag,
  Trash2,
  BarChart3,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportFilteredOrdersToCSV } from "@/lib/orders-api";

type TimeFilterType = 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'custom_range' | 'all';
type TabType = 'overview' | 'hourly' | 'payment' | 'items' | 'orders';

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
                    Real-time sales, date-range insights, peak hours & order analytics across <span className="text-primary font-bold">{stats.totalOrders.toLocaleString()}</span> total orders.
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
                <p className="text-xs text-muted-foreground">Browse, search, sort, and inspect all {totalCount.toLocaleString()} matching orders with server-side pagination.</p>
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
