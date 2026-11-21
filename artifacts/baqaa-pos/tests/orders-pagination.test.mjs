import test from 'node:test';
import assert from 'node:assert';

const SUPABASE_URL = 'https://sxojvogkvampikyrkmlm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4b2p2b2drdmFtcGlreXJrbWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzEyNTAsImV4cCI6MjA5MjQ0NzI1MH0.KajYooeK--f2Pf-l08MzPWIlQQy6mEq_s0rV73Hi39s';

function mapDbOrder(o) {
  let items = [];
  if (Array.isArray(o.items)) {
    items = o.items;
  } else if (typeof o.items === 'string') {
    try { items = JSON.parse(o.items); } catch { items = []; }
  }

  return {
    id: o.id,
    billNumber: Number(o.bill_number ?? 0),
    items,
    subtotal: Number(o.subtotal ?? 0),
    discountType: o.discount_type ?? 'none',
    discountValue: Number(o.discount_value ?? 0),
    discountAmount: Number(o.discount_amount ?? 0),
    total: Number(o.total ?? 0),
    paymentMethod: o.payment_method ?? 'Cash',
    customerName: String(o.customer_name ?? ''),
    customerPhone: String(o.customer_phone ?? ''),
    createdAt: String(o.created_at ?? ''),
  };
}

async function queryOrders({
  page = 1,
  pageSize = 20,
  timeFilter = 'all',
  startDate,
  endDate,
  paymentMethod,
  search,
  sortBy = 'created_at',
  sortOrder = 'desc',
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let url = `${SUPABASE_URL}/rest/v1/orders?select=*`;

  if (startDate && endDate) {
    url += `&created_at=gte.${startDate}&created_at=lte.${endDate}`;
  }

  if (paymentMethod && paymentMethod !== 'all') {
    url += `&payment_method=eq.${paymentMethod}`;
  }

  if (search && search.trim()) {
    const s = search.trim();
    if (/^\d+$/.test(s)) {
      url += `&or=(${encodeURIComponent(`bill_number.eq.${s},customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`)})`;
    } else {
      url += `&or=(${encodeURIComponent(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`)})`;
    }
  }

  const asc = sortOrder === 'asc';
  url += `&order=${sortBy}.${asc ? 'asc' : 'desc'},id.${asc ? 'asc' : 'desc'}`;
  url += `&offset=${from}&limit=${pageSize}`;

  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
    },
  });

  const contentRange = res.headers.get('content-range');
  let totalCount = 0;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) totalCount = parseInt(match[1], 10);
  }

  const data = await res.json();
  const orders = data.map(mapDbOrder);
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
}

test('1. Total order count in Supabase exceeds 1,000 records (verifying 1,877 orders exist)', async () => {
  const result = await queryOrders({ page: 1, pageSize: 1 });
  assert.ok(result.totalCount > 1000, `Expected totalCount > 1000, got ${result.totalCount}`);
  assert.strictEqual(result.totalCount, 1877, `Expected exactly 1877 orders in database`);
});

test('2. First page returns correct number of items and valid schema mapping', async () => {
  const result = await queryOrders({ page: 1, pageSize: 20 });
  assert.strictEqual(result.orders.length, 20);
  assert.strictEqual(result.page, 1);
  assert.strictEqual(result.totalPages, Math.ceil(1877 / 20));
  assert.strictEqual(result.hasPrevPage, false);
  assert.strictEqual(result.hasNextPage, true);

  const firstOrder = result.orders[0];
  assert.ok(firstOrder.id, 'Order id must exist');
  assert.ok(firstOrder.billNumber > 0, 'Order billNumber must be positive');
  assert.ok(firstOrder.total >= 0, 'Order total must be non-negative');
  assert.ok(firstOrder.createdAt, 'Order createdAt must exist');
});

test('3. Reaching orders beyond row 1,000 (e.g. Page 51 with pageSize 20 = rows 1000-1019)', async () => {
  // Page 51 (items 1000..1019, 0-indexed)
  const resultPage51 = await queryOrders({ page: 51, pageSize: 20 });
  assert.strictEqual(resultPage51.orders.length, 20, 'Page 51 should return exactly 20 orders');
  assert.strictEqual(resultPage51.page, 51);
  assert.ok(resultPage51.hasPrevPage, 'Page 51 should have previous page');
  assert.ok(resultPage51.hasNextPage, 'Page 51 should have next page');

  // Verify orders in page 51 are valid real orders from past row 1000
  for (const o of resultPage51.orders) {
    assert.ok(o.id, 'Every order must have an id');
    assert.ok(o.billNumber > 0, 'Every order must have a valid bill number');
    assert.ok(new Date(o.createdAt).getTime() > 0, 'Every order must have a valid date');
  }

  // The very last page (Page 94 with pageSize 20 = remaining 17 orders: 1877 - 1860 = 17)
  const lastPage = resultPage51.totalPages;
  const resultLast = await queryOrders({ page: lastPage, pageSize: 20 });
  assert.strictEqual(resultLast.orders.length, 17, 'Last page should contain remaining 17 orders');
  assert.strictEqual(resultLast.hasNextPage, false, 'Last page should not have a next page');

  // Oldest order in the database is the last item on the last page
  const oldestOrder = resultLast.orders[resultLast.orders.length - 1];
  assert.strictEqual(oldestOrder.billNumber, 1003, 'Oldest order bill number is 1003');
  assert.ok(oldestOrder.createdAt.startsWith('2026-06-01'), 'Oldest order is from 2026-06-01');
});

test('4. Deterministic sorting prevents duplicates and gaps between consecutive pages', async () => {
  const pageSize = 25;
  // Fetch page 40 (rows 975-999) and page 41 (rows 1000-1024) across the 1000-row boundary
  const page40 = await queryOrders({ page: 40, pageSize });
  const page41 = await queryOrders({ page: 41, pageSize });

  assert.strictEqual(page40.orders.length, pageSize);
  assert.strictEqual(page41.orders.length, pageSize);

  const ids40 = new Set(page40.orders.map(o => o.id));
  const ids41 = new Set(page41.orders.map(o => o.id));

  // No overlapping IDs between pages
  for (const id of ids41) {
    assert.ok(!ids40.has(id), `Order ID ${id} appeared in both page 40 and page 41!`);
  }

  // Verify timestamps are strictly monotonically descending (or equal with deterministic id ordering)
  const lastPage40 = page40.orders[page40.orders.length - 1];
  const firstPage41 = page41.orders[0];
  const t40 = new Date(lastPage40.createdAt).getTime();
  const t41 = new Date(firstPage41.createdAt).getTime();
  assert.ok(t40 >= t41, `Sorting violated across page boundary: ${t40} < ${t41}`);
});

test('5. Filtering and search calculate totals accurately rather than page count', async () => {
  // Test search for bill 1538
  const searchResult = await queryOrders({ search: '1538', page: 1, pageSize: 20 });
  assert.strictEqual(searchResult.totalCount, 2, 'Total matching search 1538 should be 2');
  assert.strictEqual(searchResult.orders.length, 2);
  assert.strictEqual(searchResult.orders[0].billNumber, 1538);

  // Test payment method filter 'Online'
  const onlineResult = await queryOrders({ paymentMethod: 'Online', page: 1, pageSize: 20 });
  assert.ok(onlineResult.totalCount > 0 && onlineResult.totalCount < 1877, 'Online orders should be a subset of all orders');
  for (const o of onlineResult.orders) {
    assert.strictEqual(o.paymentMethod, 'Online', 'All returned orders must have paymentMethod Online');
  }

  // Test date filter for July 2026
  const julyResult = await queryOrders({
    startDate: '2026-07-01T00:00:00Z',
    endDate: '2026-07-31T23:59:59Z',
    page: 1,
    pageSize: 50,
  });
  assert.strictEqual(julyResult.totalCount, 463, 'July 2026 total count should be 463');
  assert.strictEqual(julyResult.orders.length, 50, 'Page 1 should have 50 orders');
  assert.strictEqual(julyResult.totalPages, Math.ceil(463 / 50));
});

test('6. Batched chunking reaches all 1,877 orders for export without stopping at 1,000', async () => {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let allOrders = [];
  let reportedTotal = 0;

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,bill_number,total&order=created_at.desc,id.desc&offset=${offset}&limit=${CHUNK_SIZE}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        Prefer: 'count=exact',
      },
    });

    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) reportedTotal = parseInt(match[1], 10);
    }

    const chunk = await res.json();
    allOrders = allOrders.concat(chunk);

    if (chunk.length < CHUNK_SIZE || allOrders.length >= reportedTotal) {
      break;
    }
    offset += CHUNK_SIZE;
  }

  assert.strictEqual(reportedTotal, 1877, 'Reported total count should be 1877');
  assert.strictEqual(allOrders.length, 1877, `Export chunking must fetch all 1877 orders, got ${allOrders.length}`);
  assert.ok(allOrders.length > 1000, 'Export successfully bypassed 1000-row cap');
});
