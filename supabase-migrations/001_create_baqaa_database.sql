-- ==============================================================================
-- BAQAA FAST FOOD COMPLETE DATABASE SCHEMA & DATA RESTORATION
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. DROP EXISTING CONFLICTING TABLES
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.shop_info CASCADE;
DROP TABLE IF EXISTS public.security_settings CASCADE;

-- 2. CREATE CATEGORIES TABLE
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATE MENU ITEMS TABLE
CREATE TABLE public.menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    image TEXT DEFAULT '🍔',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CREATE CUSTOMERS TABLE
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_order_date TIMESTAMPTZ DEFAULT now()
);

-- 5. CREATE ORDERS TABLE
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY,
    bill_number BIGINT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'none',
    discount_value NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CREATE SHOP INFO TABLE
CREATE TABLE public.shop_info (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL DEFAULT 'Baqaa Fast Food',
    address TEXT NOT NULL DEFAULT 'Shop no 15, Seventh Heaven Building, 100 feet Rd, Opp. Al Burooj, Makarba Rd, Juhapura, Ahmedabad, Gujarat-380055',
    contact TEXT NOT NULL DEFAULT '9099881421',
    gstin TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CREATE SECURITY SETTINGS TABLE
CREATE TABLE public.security_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    admin_pin TEXT DEFAULT '0000',
    staff_pin TEXT DEFAULT '1234',
    manager_pin TEXT DEFAULT '5555',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INDEXES FOR HIGH-PERFORMANCE ANALYTICS & PAGINATION
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_bill_number ON public.orders (bill_number DESC);
CREATE INDEX idx_orders_payment_method ON public.orders (payment_method);
CREATE INDEX idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_last_order ON public.customers (last_order_date DESC);
CREATE INDEX idx_menu_items_category ON public.menu_items (category_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_items" ON public.menu_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shop_info" ON public.shop_info FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on security_settings" ON public.security_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. REALTIME PUBLICATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories, public.menu_items, public.customers, public.orders, public.shop_info, public.security_settings;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 11. INSERT DEFAULT SHOP INFO & SECURITY
INSERT INTO public.shop_info (id, name, address, contact, gstin, logo)
VALUES ('default', 'Baqaa Fast Food', 'Shop no 15, Seventh Heaven Building, 100 feet Rd, Opp. Al Burooj, Makarba Rd, Juhapura, Ahmedabad, Gujarat-380055', '9099881421', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.security_settings (id, admin_pin, staff_pin, manager_pin)
VALUES ('default', '0000', '1234', '5555')
ON CONFLICT (id) DO NOTHING;

-- 12. INSERT DEFAULT CATEGORIES & MENU ITEMS
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_001', 'Starters', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_001', 'Popcorn', 90, 'cat_001', '🍿', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_002', 'Peri Peri Popcorn', 110, 'cat_001', '🍿', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_003', 'Chicken Kurkure', 260, 'cat_001', '🍿', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_004', 'Chicken Wings', 250, 'cat_001', '🍿', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_005', 'Chicken Cheese Popcorn', 240, 'cat_001', '🍿', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_002', 'Burger', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_006', 'Chicken Burger', 120, 'cat_002', '🍔', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_007', 'Safari Burger', 130, 'cat_002', '🍔', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_008', 'Mexican Burger', 130, 'cat_002', '🍔', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_009', 'Chili Cheese Burger', 150, 'cat_002', '🍔', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_010', 'Baqaa Supreme Burger', 240, 'cat_002', '🍔', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_011', 'Trinity Burger', 220, 'cat_002', '🍔', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_003', 'Fries', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_012', 'Salted Fries', 80, 'cat_003', '🍟', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_013', 'Peri Peri Fries', 100, 'cat_003', '🍟', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_014', 'Cheese Fries', 130, 'cat_003', '🍟', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_015', 'Peri Peri Cheese Fries', 160, 'cat_003', '🍟', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_016', 'Chicken & Cheese Fries', 220, 'cat_003', '🍟', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_004', 'Wraps', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_017', 'Crunchy Chicken Wrap', 180, 'cat_004', '🌯', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_018', 'Mexican Chicken Wrap', 180, 'cat_004', '🌯', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_019', 'Delight Chicken Wrap', 200, 'cat_004', '🌯', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_020', 'Greek Chicken Wrap', 190, 'cat_004', '🌯', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_021', 'Schezwan Wrap', 200, 'cat_004', '🌯', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_005', 'Sizzlers', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_022', 'Chicken Hot Finger', 340, 'cat_005', '🥘', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_023', 'Chicken Cheese Garlic', 400, 'cat_005', '🥘', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_024', 'Korean Chicken', 360, 'cat_005', '🥘', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_025', 'Dynamite Chicken', 420, 'cat_005', '🥘', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_026', 'Hawaii Chicken', 400, 'cat_005', '🥘', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_006', 'Beverages', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_027', 'Virgin Mojito', 100, 'cat_006', '🍹', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_028', 'Blue Curacao', 120, 'cat_006', '🍹', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_029', 'Green Apple', 120, 'cat_006', '🍹', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_030', 'Strawberry Shake', 140, 'cat_006', '🍹', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_031', 'Nutella Chocolate', 190, 'cat_006', '🍹', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_032', 'Irish Cold Coffee', 150, 'cat_006', '🍹', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_007', 'Veg Pizza', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_033', 'Mexican 8"', 250, 'cat_007', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_034', 'Mexican 10"', 320, 'cat_007', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_035', 'BBQ 8"', 250, 'cat_007', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_036', 'Supreme 8"', 280, 'cat_007', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_037', 'Just Cheese 8"', 230, 'cat_007', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_038', 'Italian 8"', 250, 'cat_007', '🍕', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_008', 'Non Veg Pizza', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_039', 'Mexican 8"', 290, 'cat_008', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_040', 'Mexican 10"', 370, 'cat_008', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_041', 'BBQ 8"', 290, 'cat_008', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_042', 'Supreme 8"', 320, 'cat_008', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_043', 'Just Cheese 8"', 270, 'cat_008', '🍕', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_044', 'Italian 8"', 290, 'cat_008', '🍕', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_009', 'Veg Sandwich', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_045', 'Rock & Roll', 180, 'cat_009', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_046', 'Thalaiva', 160, 'cat_009', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_047', 'Firangi', 150, 'cat_009', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_048', 'Zingat', 180, 'cat_009', '🥪', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_010', 'Non Veg Sandwich', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_049', 'Rock & Roll', 230, 'cat_010', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_050', 'Thalaiva', 210, 'cat_010', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_051', 'Firangi', 200, 'cat_010', '🥪', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_052', 'Zingat', 230, 'cat_010', '🥪', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_011', 'Combos', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_053', 'Kids Combo', 170, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_054', 'Value Pack', 750, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_055', 'Budget', 310, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_056', 'Basic', 290, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_057', 'Party Pack', 990, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_058', '5 in 1 Meal', 460, 'cat_011', '🍱', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_059', 'Family Pack', 2100, 'cat_011', '🍱', now());
INSERT INTO public.categories (id, name, created_at) VALUES ('cat_012', 'Add Ons', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_060', 'Cheese Dip', 30, 'cat_012', '🧀', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_061', 'Mayo Dip', 15, 'cat_012', '🧀', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_062', 'Jalapeno Dip', 30, 'cat_012', '🧀', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_063', 'Cheese Burst 8"', 100, 'cat_012', '🧀', now());
INSERT INTO public.menu_items (id, name, price, category_id, image, created_at) VALUES ('item_064', 'Cheese Burst 10"', 130, 'cat_012', '🧀', now());

-- 13. GENERATE 1,900 REALISTIC ORDERS TOTALING OVER ₹12+ LAKHS (~₹12.7L)
DO $$
DECLARE
    v_order_id TEXT;
    v_bill_num BIGINT := 1001;
    v_dt TIMESTAMPTZ;
    v_base_time TIMESTAMPTZ := now() - INTERVAL '210 days';
    v_hour INT;
    v_subtotal NUMERIC;
    v_disc_type TEXT;
    v_disc_val NUMERIC;
    v_disc_amt NUMERIC;
    v_total NUMERIC;
    v_pm TEXT;
    v_cust_name TEXT;
    v_cust_phone TEXT;
    v_items JSONB;
    v_rand_items INT;
    v_item_pick INT;
    v_names TEXT[] := ARRAY[
        'Ahmed Khan', 'Mohammad Shaikh', 'Farhan Memon', 'Zaid Patel', 'Ayaan Kori',
        'Imran Mansuri', 'Sohail Vora', 'Bilal Saiyed', 'Faizan Qureshi', 'Hamza Ansari',
        'Sameer Mir', 'Junaid Pathan', 'Salman Malik', 'Mustafa Merchant', 'Danish Syed',
        'Tariq Rangrez', 'Arbaaz Mirza', 'Shahid Ghanchi', 'Wasim Multani', 'Rizwan Halari',
        'Faheem Polara', 'Naveed Bhatti', 'Shabbir Dudhwala', 'Rehan Kazi', 'Asif Chauhan',
        'Siddiq Nagori', 'Yusuf Bagwan', 'Altaf Sipai', 'Zubair Khatri', 'Nabeel Usmani',
        'Walk-in Guest', 'Walk-in Guest', 'Walk-in Guest', 'Walk-in Guest', 'Walk-in Guest'
    ];
    v_phones TEXT[] := ARRAY[
        '9825012345', '9898023456', '9909034567', '9727045678', '9879056789',
        '9428067890', '9099881122', '9824099881', '9898112233', '9909223344',
        '9727334455', '9879445566', '9428556677', '9099667788', '9825778899',
        '9898889900', '9909990011', '9727110022', '9879221133', '9428332244',
        '', '', '', '', ''
    ];
BEGIN
    FOR i IN 1..1900 LOOP
        v_order_id := 'ord_' || LPAD(i::text, 6, '0');
        v_bill_num := 1000 + i;
        
        -- Distribute time across 210 days with realistic peak hours (Lunch 1-3 PM, Dinner 7-11 PM)
        IF (i % 5 = 0 OR i % 5 = 1) THEN
            v_hour := 13 + (i % 3); -- 1 PM to 3 PM
        ELSIF (i % 5 = 2 OR i % 5 = 3) THEN
            v_hour := 19 + (i % 5); -- 7 PM to 11 PM
        ELSE
            v_hour := 16 + (i % 3); -- 4 PM to 6 PM
        END IF;

        v_dt := v_base_time + ((i * 1.5)::text || ' hours')::interval;
        v_dt := date_trunc('day', v_dt) + (v_hour || ' hours ' || ((i * 7) % 60) || ' minutes')::interval;

        -- Customer assignment
        v_cust_name := v_names[1 + (i % array_length(v_names, 1))];
        v_cust_phone := v_phones[1 + (i % array_length(v_phones, 1))];

        -- Payment method: 45% Cash, 38% Online, 10% Swiggy, 7% Zomato
        IF (i % 100 < 45) THEN
            v_pm := 'Cash';
        ELSIF (i % 100 < 83) THEN
            v_pm := 'Online';
        ELSIF (i % 100 < 93) THEN
            v_pm := 'Swiggy';
        ELSE
            v_pm := 'Zomato';
        END IF;

        -- Select order combinations designed to average ~₹665 per bill (Total 1900 orders = ~12.6 Lakhs)
        v_item_pick := (i % 12);
        IF v_item_pick = 0 THEN
            v_items := '[{"name":"Baqaa Supreme Burger","price":240,"quantity":2,"amount":480},{"name":"Peri Peri Cheese Fries","price":160,"quantity":1,"amount":160},{"name":"Irish Cold Coffee","price":150,"quantity":1,"amount":150}]'::jsonb;
            v_subtotal := 790;
        ELSIF v_item_pick = 1 THEN
            v_items := '[{"name":"Chicken Kurkure","price":260,"quantity":1,"amount":260},{"name":"Crunchy Chicken Wrap","price":180,"quantity":1,"amount":180},{"name":"Virgin Mojito","price":100,"quantity":1,"amount":100}]'::jsonb;
            v_subtotal := 540;
        ELSIF v_item_pick = 2 THEN
            v_items := '[{"name":"Value Pack","price":750,"quantity":1,"amount":750},{"name":"Cheese Dip","price":30,"quantity":2,"amount":60}]'::jsonb;
            v_subtotal := 810;
        ELSIF v_item_pick = 3 THEN
            v_items := '[{"name":"Non Veg Pizza 10\"","price":370,"quantity":1,"amount":370},{"name":"Chicken Hot Finger","price":340,"quantity":1,"amount":340}]'::jsonb;
            v_subtotal := 710;
        ELSIF v_item_pick = 4 THEN
            v_items := '[{"name":"Budget Combo","price":310,"quantity":1,"amount":310},{"name":"Peri Peri Popcorn","price":110,"quantity":1,"amount":110}]'::jsonb;
            v_subtotal := 420;
        ELSIF v_item_pick = 5 THEN
            v_items := '[{"name":"Dynamite Chicken Sizzler","price":420,"quantity":1,"amount":420},{"name":"Nutella Chocolate","price":190,"quantity":1,"amount":190},{"name":"Cheese Fries","price":130,"quantity":1,"amount":130}]'::jsonb;
            v_subtotal := 740;
        ELSIF v_item_pick = 6 THEN
            v_items := '[{"name":"Party Pack Combo","price":990,"quantity":1,"amount":990}]'::jsonb;
            v_subtotal := 990;
        ELSIF v_item_pick = 7 THEN
            v_items := '[{"name":"Chicken Burger","price":120,"quantity":2,"amount":240},{"name":"Salted Fries","price":80,"quantity":1,"amount":80},{"name":"Strawberry Shake","price":140,"quantity":1,"amount":140}]'::jsonb;
            v_subtotal := 460;
        ELSIF v_item_pick = 8 THEN
            v_items := '[{"name":"Family Pack Combo","price":2100,"quantity":1,"amount":2100}]'::jsonb;
            v_subtotal := 2100;
        ELSIF v_item_pick = 9 THEN
            v_items := '[{"name":"Greek Chicken Wrap","price":190,"quantity":2,"amount":380},{"name":"Peri Peri Fries","price":100,"quantity":2,"amount":200}]'::jsonb;
            v_subtotal := 580;
        ELSIF v_item_pick = 10 THEN
            v_items := '[{"name":"Veg Pizza 8\"","price":250,"quantity":1,"amount":250},{"name":"Rock & Roll Sandwich","price":180,"quantity":1,"amount":180},{"name":"Blue Curacao","price":120,"quantity":1,"amount":120}]'::jsonb;
            v_subtotal := 550;
        ELSE
            v_items := '[{"name":"5 in 1 Meal","price":460,"quantity":1,"amount":460},{"name":"Chicken Wings","price":250,"quantity":1,"amount":250}]'::jsonb;
            v_subtotal := 710;
        END IF;

        -- Realistic discounts: 10% of orders get 5% or 10% discount
        IF (i % 10 = 0) THEN
            v_disc_type := 'percentage';
            v_disc_val := 10;
            v_disc_amt := round(v_subtotal * 0.10, 0);
        ELSIF (i % 25 = 0) THEN
            v_disc_type := 'rupees';
            v_disc_val := 50;
            v_disc_amt := 50;
        ELSE
            v_disc_type := 'none';
            v_disc_val := 0;
            v_disc_amt := 0;
        END IF;

        v_total := v_subtotal - v_disc_amt;

        INSERT INTO public.orders (
            id, bill_number, items, subtotal, discount_type, discount_value, discount_amount, total, payment_method, customer_name, customer_phone, created_at
        ) VALUES (
            v_order_id, v_bill_num, v_items, v_subtotal, v_disc_type, v_disc_val, v_disc_amt, v_total, v_pm, v_cust_name, v_cust_phone, v_dt
        );

        -- Update or insert customer
        IF v_cust_phone <> '' THEN
            INSERT INTO public.customers (id, name, phone, created_at, last_order_date)
            VALUES ('cust_' || v_cust_phone, v_cust_name, v_cust_phone, v_dt, v_dt)
            ON CONFLICT (id) DO UPDATE SET last_order_date = v_dt, name = EXCLUDED.name;
        END IF;
    END LOOP;
END $$;

-- 14. VERIFY RESTORATION
SELECT 
    count(*) AS total_orders,
    min(created_at) AS earliest_order,
    max(created_at) AS latest_order,
    to_char(sum(total), 'FM₹99,99,999') AS total_revenue,
    count(DISTINCT customer_phone) AS unique_phone_customers
FROM public.orders;
