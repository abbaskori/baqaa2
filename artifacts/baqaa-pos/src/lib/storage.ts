import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface SecuritySettings {
  adminPin: string;
  staffPin: string;
  managerPin: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  contact: string;
  gstin: string;
  logo: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

export interface Order {
  id: string;
  billNumber: number;
  items: OrderItem[];
  subtotal: number;
  discountType: 'none' | 'percentage' | 'rupees';
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'Cash' | 'Online' | 'Swiggy' | 'Zomato';
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lastOrderDate: string;
}

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────
const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'Baqaa Fast Food',
  address: 'Shop no 15, Seventh Heaven Building, 100 feet Rd, Opp. Al Burooj, Makarba Rd, Juhapura, Ahmedabad, Gujarat-380055',
  contact: '9099881421',
  gstin: '',
  logo: '',
};

const DEFAULT_SECURITY: SecuritySettings = {
  adminPin: '0000',
  staffPin: '1234',
  managerPin: '5555',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
export const emitChange = () => window.dispatchEvent(new Event('baqaa_storage_update'));

/** Map a Supabase DB row → app Category */
function dbToCat(r: any): Category {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

/** Map a Supabase DB row → app MenuItem */
function dbToItem(r: any): MenuItem {
  return { id: r.id, name: r.name, price: Number(r.price), categoryId: r.category_id, image: r.image || '🍔', createdAt: r.created_at };
}

/** Map a Supabase DB row → app Order */
function dbToOrder(r: any): Order {
  let items: OrderItem[] = [];
  if (Array.isArray(r.items)) items = r.items;
  else if (typeof r.items === 'string') { try { items = JSON.parse(r.items); } catch { items = []; } }
  return {
    id: r.id,
    billNumber: Number(r.bill_number ?? 0),
    items,
    subtotal: Number(r.subtotal ?? 0),
    discountType: (r.discount_type ?? 'none') as Order['discountType'],
    discountValue: Number(r.discount_value ?? 0),
    discountAmount: Number(r.discount_amount ?? 0),
    total: Number(r.total ?? 0),
    paymentMethod: (r.payment_method ?? 'Cash') as Order['paymentMethod'],
    customerName: String(r.customer_name ?? ''),
    customerPhone: String(r.customer_phone ?? ''),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

/** Map a Supabase DB row → app Customer */
function dbToCustomer(r: any): Customer {
  return { id: r.id, name: r.name, phone: r.phone ?? '', createdAt: r.created_at, lastOrderDate: r.last_order_date ?? r.created_at };
}

// ─────────────────────────────────────────────
// Bill counter — only thing kept in localStorage
// (single source of truth is Supabase; this is
//  just a local increment buffer synced on load)
// ─────────────────────────────────────────────
const BILL_KEY = 'baqaa_bill_counter';

function getLocalBill(): number {
  return parseInt(localStorage.getItem(BILL_KEY) || '1001', 10);
}

function setLocalBill(n: number) {
  localStorage.setItem(BILL_KEY, String(n));
}

// ─────────────────────────────────────────────
// initializeStorage — called once on app start
// ─────────────────────────────────────────────
export async function initializeStorage() {
  // Sync bill counter from cloud
  const { data: latest } = await supabase
    .from('orders')
    .select('bill_number')
    .order('bill_number', { ascending: false })
    .limit(1);
  if (latest && latest.length > 0) {
    const max = Number(latest[0].bill_number);
    if (max >= getLocalBill()) setLocalBill(max + 1);
  }
  emitChange();
}

// ─────────────────────────────────────────────
// StorageAPI — all data ops go to Supabase
// ─────────────────────────────────────────────
export const StorageAPI = {

  // ── SHOP INFO ──────────────────────────────
  getShopInfo: async (): Promise<ShopInfo> => {
    try {
      const { data, error } = await supabase.from('shop_info').select('*').eq('id', 'default').maybeSingle();
      if (error || !data) return DEFAULT_SHOP_INFO;
      return { name: data.name, address: data.address, contact: data.contact, gstin: data.gstin ?? '', logo: data.logo ?? '' };
    } catch {
      return DEFAULT_SHOP_INFO;
    }
  },

  setShopInfo: async (info: ShopInfo): Promise<void> => {
    const { error } = await supabase.from('shop_info').upsert({ id: 'default', ...info, updated_at: new Date().toISOString() });
    if (error) {
      console.error('Supabase setShopInfo error:', error);
      throw error;
    }
    emitChange();
  },

  // ── SECURITY ───────────────────────────────
  getSecuritySettings: async (): Promise<SecuritySettings> => {
    try {
      const { data, error } = await supabase.from('security_settings').select('*').eq('id', 'default').maybeSingle();
      if (error || !data) return DEFAULT_SECURITY;
      return { adminPin: data.admin_pin ?? '0000', staffPin: data.staff_pin ?? '1234', managerPin: data.manager_pin ?? '5555' };
    } catch {
      return DEFAULT_SECURITY;
    }
  },

  setSecuritySettings: async (settings: SecuritySettings): Promise<void> => {
    const { error } = await supabase.from('security_settings').upsert({
      id: 'default',
      admin_pin: settings.adminPin,
      staff_pin: settings.staffPin,
      manager_pin: settings.managerPin,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Supabase setSecuritySettings error:', error);
      throw error;
    }
    emitChange();
  },

  // ── CATEGORIES ─────────────────────────────
  getCategories: async (): Promise<Category[]> => {
    const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    return (data || []).map(dbToCat);
  },

  addCategory: async (name: string): Promise<Category> => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('categories').insert({ id, name, created_at: now }).select().single();
    if (error) throw error;
    emitChange();
    return dbToCat(data);
  },

  deleteCategory: async (id: string): Promise<void> => {
    await supabase.from('categories').delete().eq('id', id);
    emitChange();
  },

  // ── MENU ITEMS ─────────────────────────────
  getMenuItems: async (): Promise<MenuItem[]> => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: true });
    return (data || []).map(dbToItem);
  },

  addMenuItem: async (item: Omit<MenuItem, 'id' | 'createdAt'>): Promise<MenuItem> => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('menu_items').insert({
      id, name: item.name, price: item.price,
      category_id: item.categoryId, image: item.image, created_at: now,
    }).select().single();
    if (error) throw error;
    emitChange();
    return dbToItem(data);
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<void> => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.image !== undefined) payload.image = updates.image;
    await supabase.from('menu_items').update(payload).eq('id', id);
    emitChange();
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await supabase.from('menu_items').delete().eq('id', id);
    emitChange();
  },

  // ── ORDERS ─────────────────────────────────
  getOrders: async (limit = 50): Promise<Order[]> => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).map(dbToOrder);
  },

  addOrder: async (orderData: Omit<Order, 'id' | 'billNumber'>): Promise<Order> => {
    const id = uuidv4();
    const billNumber = getLocalBill();
    setLocalBill(billNumber + 1);

    const row = {
      id,
      bill_number: billNumber,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount_type: orderData.discountType,
      discount_value: orderData.discountValue,
      discount_amount: orderData.discountAmount,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      created_at: orderData.createdAt || new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert(row).select().single();
    if (error) throw error;

    // Upsert customer if phone/name provided
    if (orderData.customerPhone || orderData.customerName) {
      const custId = orderData.customerPhone
        ? `cust_${orderData.customerPhone}`
        : `cust_name_${orderData.customerName.replace(/\s+/g, '_').toLowerCase()}`;
      await supabase.from('customers').upsert({
        id: custId,
        name: orderData.customerName,
        phone: orderData.customerPhone,
        created_at: row.created_at,
        last_order_date: row.created_at,
      }, { onConflict: 'id' });
    }

    emitChange();
    return dbToOrder(data);
  },

  updateOrder: async (id: string, updates: Omit<Order, 'id' | 'billNumber'>): Promise<Order | null> => {
    const { data, error } = await supabase.from('orders').update({
      items: updates.items,
      subtotal: updates.subtotal,
      discount_type: updates.discountType,
      discount_value: updates.discountValue,
      discount_amount: updates.discountAmount,
      total: updates.total,
      payment_method: updates.paymentMethod,
      customer_name: updates.customerName,
      customer_phone: updates.customerPhone,
    }).eq('id', id).select().single();
    if (error) return null;
    emitChange();
    return dbToOrder(data);
  },

  deleteOrder: async (id: string): Promise<void> => {
    await supabase.from('orders').delete().eq('id', id);
    emitChange();
  },

  // ── CUSTOMERS ──────────────────────────────
  getCustomers: async (): Promise<Customer[]> => {
    const { data } = await supabase.from('customers').select('*').order('last_order_date', { ascending: false });
    return (data || []).map(dbToCustomer);
  },

  // ── RESET (admin) ──────────────────────────
  resetData: async (): Promise<void> => {
    await supabase.from('orders').delete().neq('id', 'none');
    await supabase.from('customers').delete().neq('id', 'none');
    setLocalBill(1001);
    emitChange();
  },

  // ── Legacy sync shims (no-ops, kept for compat) ──
  resetCloudData: async (): Promise<void> => {
    await supabase.from('orders').delete().neq('id', 'none');
    await supabase.from('customers').delete().neq('id', 'none');
    setLocalBill(1001);
    emitChange();
  },
  fetchCloudData: async () => { emitChange(); },
  syncLocalToCloud: async () => ({ orders: 0, customers: 0, errors: [] }),
  listenForWebhooks: () => () => {},
};
