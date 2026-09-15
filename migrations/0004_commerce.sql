CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Umum',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  gallery_json TEXT NOT NULL DEFAULT '[]',
  price INTEGER NOT NULL DEFAULT 0,
  compare_at_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT NOT NULL DEFAULT '',
  weight_grams INTEGER NOT NULL DEFAULT 0,
  seller_city TEXT NOT NULL DEFAULT '',
  flash_sale INTEGER NOT NULL DEFAULT 0,
  flash_start TEXT,
  flash_end TEXT,
  rating REAL NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','draft','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category,status);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','processing','shipped','completed','cancelled','expired','refunded')),
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  customer_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'DOKU',
  payment_url TEXT NOT NULL DEFAULT '',
  payment_reference TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status,created_at DESC);

CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_slug TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','expired','refunded')),
  payment_url TEXT NOT NULL DEFAULT '',
  payment_reference TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gifts_user ON gifts(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_author ON gifts(author_slug,status,created_at DESC);

CREATE TABLE IF NOT EXISTS doku_webhook_events (
  request_id TEXT PRIMARY KEY,
  invoice TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
