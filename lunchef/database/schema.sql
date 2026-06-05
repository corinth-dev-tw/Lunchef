-- D1 Database Schema for Lunchef
-- B2B Lunch Ordering Platform

-- Locations (Office Buildings in Xinyi District)
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Companies (B2B Clients)
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL UNIQUE,
    location_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Users (Company Secretaries/Representatives)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_user_id TEXT NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'secretary',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cuisine_type TEXT DEFAULT 'asian',
    department_store TEXT NOT NULL,
    floor TEXT,
    phone TEXT,
    image_url TEXT,
    order_cutoff_time TEXT NOT NULL DEFAULT '09:00',
    min_order_type TEXT DEFAULT 'items',
    min_order_value INTEGER DEFAULT 10,
    api_key TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Restaurant-Location Availability
CREATE TABLE IF NOT EXISTS restaurant_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE(restaurant_id, location_id)
);

-- Pickup Time Slots (Restaurant-defined windows)
CREATE TABLE IF NOT EXISTS pickup_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    time_slot TEXT NOT NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    category TEXT DEFAULT 'main',
    image_url TEXT,
    available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Orders (with formatted order numbers)
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    pickup_time TEXT NOT NULL,
    order_date DATE NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    company_name TEXT,
    tax_id TEXT,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    special_requests TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_locations_location_id ON restaurant_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_locations_restaurant_id ON restaurant_locations(restaurant_id);

-- Seed Data - Real Xinyi District Office Buildings
INSERT OR IGNORE INTO locations (name, address) VALUES 
    ('Taipei 101', 'No. 7, Section 5, Xinyi Road, Xinyi District'),
    ('ATT 4 FUN', 'No. 12, Songshou Road, Xinyi District'),
    ('Neo 19', 'No. 19, Songshou Road, Xinyi District'),
    ('CitiBank Tower', 'No. 1, Songzhi Road, Xinyi District'),
    ('Breeze Xinyi', 'No. 68, Section 5, Zhongxiao East Road, Xinyi District'),
    ('Taipei Nan Shan Plaza', 'No. 100, Songren Road, Xinyi District'),
    ('Eslite Xinyi', 'No. 11, Songgao Road, Xinyi District'),
    ('Far Eastern Hospital', 'No. 201, Section 2, Xinyi Road, Xinyi District'),
    ('Cathay Landmark', 'No. 296, Section 4, Xinyi Road, Xinyi District'),
    ('Fubon Xinyi', 'No. 168, Section 3, Xinyi Road, Xinyi District'),
    ('Grand Hyatt Taipei', 'No. 2, Songshou Road, Xinyi District'),
    ('W Hotel Taipei', 'No. 10, Section 5, Zhongxiao East Road, Xinyi District');

INSERT OR IGNORE INTO companies (name, tax_id, location_id) VALUES 
    ('Demo Company', '12345678', 1);

INSERT OR IGNORE INTO restaurants (name, cuisine_type, department_store, floor, phone, image_url, order_cutoff_time, min_order_type, min_order_value, api_key) VALUES 
    ('想泰多 松高店', 'thai', 'ATT 4 FUN', 'B1', '02-2345-6789', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', '09:00', 'items', 10, 'thai123');

INSERT OR IGNORE INTO restaurant_locations (restaurant_id, location_id, is_available) VALUES 
    (1, 1, 1),
    (1, 2, 1),
    (1, 3, 1),
    (1, 6, 1),
    (1, 7, 1);

INSERT OR IGNORE INTO pickup_times (restaurant_id, time_slot) VALUES 
    (1, '11:30'),
    (1, '12:00'),
    (1, '12:30');

INSERT OR IGNORE INTO menu_items (restaurant_id, name, description, price, category) VALUES 
    (1, '泰式打拋豬肉飯', '經典泰式打拋豬肉配茉莉香米', 150, 'main'),
    (1, '綠咖哩雞肉飯', '椰奶綠咖哩配雞肉與時蔬', 160, 'main'),
    (1, '泰式酸辣海鮮湯', '經典Tom Yum海鮮湯', 180, 'main'),
    (1, '泰式炒河粉', 'Pad Thai配蝦仁與豆芽', 140, 'main'),
    (1, '芒果糯米飯', '新鮮芒果配椰漿糯米', 80, 'dessert'),
    (1, '泰式奶茶', '道地泰式奶茶', 50, 'drink');
