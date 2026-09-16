CREATE TABLE IF NOT EXISTS sticker_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Karakter',
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sticker_library_active_sort
  ON sticker_library(is_active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_sticker_library_category
  ON sticker_library(category, is_active);
