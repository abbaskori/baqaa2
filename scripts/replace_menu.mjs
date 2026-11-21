/**
 * replace_menu.mjs
 * Wipes existing menu_items + categories, then inserts the new Baqaa menu.
 * Run: node scripts/replace_menu.mjs
 */

const SUPABASE_URL = 'https://sxojvogkvampikyrkmlm.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4b2p2b2drdmFtcGlreXJrbWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg3MTI1MCwiZXhwIjoyMDkyNDQ3MjUwfQ.NH3RePWqhtn5_mnuxDQkigak8j0MyPwCoSn8G6XJdFY';

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function sb(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── New menu data ────────────────────────────────────────────────────────────
const MENU = [
  // Starter
  { name: 'Popcorn Chicken',          category: 'Starter', price: 89,  image: '🍗' },
  { name: 'Peri Peri Popcorn Chicken', category: 'Starter', price: 109, image: '🍗' },
  { name: 'Chicken Double Trouble',    category: 'Starter', price: 249, image: '🍗' },
  { name: 'Chicken Cheese Popcorn',    category: 'Starter', price: 239, image: '🍗' },
  { name: 'Chicken Kurkure With Dip',  category: 'Starter', price: 279, image: '🍗' },

  // Burger (Non-Veg)
  { name: 'Chicken Burger',              category: 'Burger (Non-Veg)', price: 119, image: '🍔' },
  { name: 'Chicken Safari Burger',       category: 'Burger (Non-Veg)', price: 129, image: '🍔' },
  { name: 'Chicken Mexican Burger',      category: 'Burger (Non-Veg)', price: 129, image: '🍔' },
  { name: 'Chicken Chili Cheese Burger', category: 'Burger (Non-Veg)', price: 149, image: '🍔' },
  { name: 'Nashville Burger',            category: 'Burger (Non-Veg)', price: 169, image: '🍔' },
  { name: 'Sizzling Chicken Burger',     category: 'Burger (Non-Veg)', price: 199, image: '🍔' },
  { name: 'Sizzling Nashville Burger',   category: 'Burger (Non-Veg)', price: 239, image: '🍔' },
  { name: 'Chi. Baqaa Supreme Burger',   category: 'Burger (Non-Veg)', price: 239, image: '🍔' },
  { name: 'Trinity Burger',              category: 'Burger (Non-Veg)', price: 249, image: '🍔' },

  // Burger (Veg)
  { name: 'Veg. Burger',          category: 'Burger (Veg)', price: 79,  image: '🍔' },
  { name: 'Veg. Sizzling Burger', category: 'Burger (Veg)', price: 179, image: '🍔' },

  // Wrap (Non-Veg)
  { name: 'Grill Chicken Wrap',   category: 'Wrap (Non-Veg)', price: 199, image: '🌯' },
  { name: 'Golden Chicken Wrap',  category: 'Wrap (Non-Veg)', price: 219, image: '🌯' },
  { name: 'Crunchy Chicken Wrap', category: 'Wrap (Non-Veg)', price: 189, image: '🌯' },
  { name: 'Mexican Chicken Wrap', category: 'Wrap (Non-Veg)', price: 189, image: '🌯' },
  { name: 'Delight Chicken Wrap', category: 'Wrap (Non-Veg)', price: 209, image: '🌯' },
  { name: 'Greek Chicken Wrap',   category: 'Wrap (Non-Veg)', price: 189, image: '🌯' },
  { name: 'Schezwan Wrap',        category: 'Wrap (Non-Veg)', price: 199, image: '🌯' },

  // Wrap (Veg)
  { name: 'Veg. Wrap', category: 'Wrap (Veg)', price: 149, image: '🌯' },

  // Fries
  { name: 'Salted Fries',           category: 'Fries', price: 79,  image: '🍟' },
  { name: 'Peri Peri Fries',        category: 'Fries', price: 99,  image: '🍟' },
  { name: 'Baqaa Fire Fries',       category: 'Fries', price: 119, image: '🍟' },
  { name: 'Cheese Fries',           category: 'Fries', price: 129, image: '🍟' },
  { name: 'Peri Peri Cheese Fries', category: 'Fries', price: 159, image: '🍟' },
  { name: 'Chicken & Cheese Fries', category: 'Fries', price: 219, image: '🍟' },
  { name: 'Zunglee Chicken Fries',  category: 'Fries', price: 239, image: '🍟' },

  // Sizzlers
  { name: 'Chicken Hot Finger',    category: 'Sizzlers', price: 349, image: '🥩' },
  { name: 'Chicken Cheese Garlic', category: 'Sizzlers', price: 399, image: '🥩' },
  { name: 'Korean Chicken',        category: 'Sizzlers', price: 359, image: '🥩' },
  { name: 'Dynamite Chicken',      category: 'Sizzlers', price: 419, image: '🥩' },
  { name: 'Hawaiian Chicken',      category: 'Sizzlers', price: 399, image: '🥩' },

  // Club Sandwich (Non-Veg)
  { name: 'Rock & Roll Sandwich', category: 'Club Sandwich (Non-Veg)', price: 229, image: '🥪' },
  { name: 'Thalaiva Sandwich',    category: 'Club Sandwich (Non-Veg)', price: 209, image: '🥪' },
  { name: 'Firangi Sandwich',     category: 'Club Sandwich (Non-Veg)', price: 199, image: '🥪' },
  { name: 'Zingat Sandwich',      category: 'Club Sandwich (Non-Veg)', price: 229, image: '🥪' },

  // Club Sandwich (Veg)
  { name: 'Rock & Roll Sandwich', category: 'Club Sandwich (Veg)', price: 179, image: '🥪' },
  { name: 'Thalaiva Sandwich',    category: 'Club Sandwich (Veg)', price: 159, image: '🥪' },
  { name: 'Firangi Sandwich',     category: 'Club Sandwich (Veg)', price: 149, image: '🥪' },
  { name: 'Zingat Sandwich',      category: 'Club Sandwich (Veg)', price: 179, image: '🥪' },

  // Pizza (Veg) 8"
  { name: 'Mexican Pizza 8"',     category: 'Pizza (Veg)', price: 259, image: '🍕' },
  { name: 'BBQ Pizza 8"',         category: 'Pizza (Veg)', price: 269, image: '🍕' },
  { name: 'Supreme Pizza 8"',     category: 'Pizza (Veg)', price: 269, image: '🍕' },
  { name: 'Just Cheese Pizza 8"', category: 'Pizza (Veg)', price: 249, image: '🍕' },
  { name: 'Italian Pizza 8"',     category: 'Pizza (Veg)', price: 259, image: '🍕' },
  { name: 'Achari Pizza 8"',      category: 'Pizza (Veg)', price: 279, image: '🍕' },
  // Pizza (Veg) 10"
  { name: 'Mexican Pizza 10"',     category: 'Pizza (Veg)', price: 329, image: '🍕' },
  { name: 'BBQ Pizza 10"',         category: 'Pizza (Veg)', price: 379, image: '🍕' },
  { name: 'Supreme Pizza 10"',     category: 'Pizza (Veg)', price: 419, image: '🍕' },
  { name: 'Just Cheese Pizza 10"', category: 'Pizza (Veg)', price: 389, image: '🍕' },
  { name: 'Italian Pizza 10"',     category: 'Pizza (Veg)', price: 399, image: '🍕' },
  { name: 'Achari Pizza 10"',      category: 'Pizza (Veg)', price: 439, image: '🍕' },

  // Pizza (Non-Veg) 8"
  { name: 'Mexican Pizza 8"',     category: 'Pizza (Non-Veg)', price: 299, image: '🍕' },
  { name: 'BBQ Pizza 8"',         category: 'Pizza (Non-Veg)', price: 309, image: '🍕' },
  { name: 'Supreme Pizza 8"',     category: 'Pizza (Non-Veg)', price: 309, image: '🍕' },
  { name: 'Just Cheese Pizza 8"', category: 'Pizza (Non-Veg)', price: 289, image: '🍕' },
  { name: 'Italian Pizza 8"',     category: 'Pizza (Non-Veg)', price: 299, image: '🍕' },
  { name: 'Achari Pizza 8"',      category: 'Pizza (Non-Veg)', price: 319, image: '🍕' },
  // Pizza (Non-Veg) 10"
  { name: 'Mexican Pizza 10"',     category: 'Pizza (Non-Veg)', price: 399, image: '🍕' },
  { name: 'BBQ Pizza 10"',         category: 'Pizza (Non-Veg)', price: 439, image: '🍕' },
  { name: 'Supreme Pizza 10"',     category: 'Pizza (Non-Veg)', price: 479, image: '🍕' },
  { name: 'Just Cheese Pizza 10"', category: 'Pizza (Non-Veg)', price: 449, image: '🍕' },
  { name: 'Italian Pizza 10"',     category: 'Pizza (Non-Veg)', price: 459, image: '🍕' },
  { name: 'Achari Pizza 10"',      category: 'Pizza (Non-Veg)', price: 499, image: '🍕' },

  // Salad
  { name: 'Chicken Salad', category: 'Salad', price: 249, image: '🥗' },

  // Mocktails & Beverages
  { name: 'Virgin Mojito',       category: 'Mocktails & Beverages', price: 99,  image: '🍹' },
  { name: 'Blue Curaco',         category: 'Mocktails & Beverages', price: 119, image: '🍹' },
  { name: 'Green Apple',         category: 'Mocktails & Beverages', price: 119, image: '🍹' },
  { name: 'Strawberry Shake',    category: 'Mocktails & Beverages', price: 139, image: '🥤' },
  { name: 'Nutella Chocolate',   category: 'Mocktails & Beverages', price: 189, image: '🥤' },
  { name: 'Irish Cold Coffee',   category: 'Mocktails & Beverages', price: 149, image: '☕' },

  // Dessert
  { name: 'Molten Cookies', category: 'Dessert', price: 199, image: '🍪' },

  // Meal (Non-Veg)
  { name: 'Chicken Burger Meal', category: 'Meal (Non-Veg)', price: 199, image: '🍱' },
  { name: 'Chicken Wrap Meal',   category: 'Meal (Non-Veg)', price: 299, image: '🍱' },

  // Meal (Veg)
  { name: 'Veg. Burger Meal', category: 'Meal (Veg)', price: 149, image: '🍱' },
  { name: 'Veg. Wrap Meal',   category: 'Meal (Veg)', price: 249, image: '🍱' },

  // Combo
  { name: 'Kids Combo',   category: 'Combo', price: 169,  image: '🎁' },
  { name: 'Basic',        category: 'Combo', price: 289,  image: '🎁' },
  { name: 'Budget',       category: 'Combo', price: 309,  image: '🎁' },
  { name: '5 in 1 Meal',  category: 'Combo', price: 459,  image: '🎁' },
  { name: 'Couple Combo', category: 'Combo', price: 599,  image: '🎁' },
  { name: 'Value Pack',   category: 'Combo', price: 749,  image: '🎁' },
  { name: 'Party Pack',   category: 'Combo', price: 989,  image: '🎁' },
  { name: 'Jumbo Meal',   category: 'Combo', price: 1099, image: '🎁' },
  { name: 'Mega Combo',   category: 'Combo', price: 1349, image: '🎁' },
  { name: 'Family Pack',  category: 'Combo', price: 2099, image: '🎁' },

  // Add-On
  { name: 'Mayo Dip',         category: 'Add-On', price: 15,  image: '🥣' },
  { name: 'Cheese Dip',       category: 'Add-On', price: 30,  image: '🧀' },
  { name: 'Jalapeno Dip',     category: 'Add-On', price: 30,  image: '🥣' },
  { name: 'Mexican Dip',      category: 'Add-On', price: 30,  image: '🥣' },
  { name: 'Cheese Burst 8"',  category: 'Add-On', price: 100, image: '🧀' },
  { name: 'Cheese Burst 10"', category: 'Add-On', price: 130, image: '🧀' },
];

// Ordered category list
const CATEGORY_ORDER = [
  'Starter',
  'Burger (Non-Veg)',
  'Burger (Veg)',
  'Wrap (Non-Veg)',
  'Wrap (Veg)',
  'Fries',
  'Sizzlers',
  'Club Sandwich (Non-Veg)',
  'Club Sandwich (Veg)',
  'Pizza (Veg)',
  'Pizza (Non-Veg)',
  'Salad',
  'Mocktails & Beverages',
  'Dessert',
  'Meal (Non-Veg)',
  'Meal (Veg)',
  'Combo',
  'Add-On',
];

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🗑  Deleting existing menu_items...');
  try {
    await sb('DELETE', 'menu_items?id=neq.placeholder', null);
  } catch (e) {
    console.log('menu_items delete note:', e.message);
  }
  console.log('✅  menu_items cleared');

  console.log('🗑  Deleting existing categories...');
  try {
    await sb('DELETE', 'categories?id=neq.placeholder', null);
  } catch (e) {
    console.log('categories delete note:', e.message);
  }
  console.log('✅  categories cleared');

  console.log('📦  Inserting categories...');
  const catRows = CATEGORY_ORDER.map((name, i) => ({
    id: `cat_${String(i + 1).padStart(3, '0')}`,
    name,
  }));
  const insertedCats = await sb('POST', 'categories', catRows);
  const catMap = {};
  for (const c of insertedCats) catMap[c.name] = c.id;
  console.log(`✅  ${insertedCats.length} categories inserted:`, Object.keys(catMap));

  console.log('🍔  Inserting menu items...');
  const itemRows = MENU.map((item, i) => {
    const catId = catMap[item.category];
    if (!catId) throw new Error(`Category not found: ${item.category}`);
    return {
      id: `item_${String(i + 1).padStart(3, '0')}`,
      name: item.name,
      category_id: catId,
      price: item.price,
      image: item.image,
    };
  });

  // Insert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < itemRows.length; i += BATCH) {
    const batch = itemRows.slice(i, i + BATCH);
    await sb('POST', 'menu_items', batch);
    inserted += batch.length;
    console.log(`   ...${inserted}/${itemRows.length} items`);
  }

  console.log(`\n🎉  Done! Successfully added ${insertedCats.length} categories and ${itemRows.length} menu items to Supabase.`);
})().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
