CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'Berita',
  author_name TEXT NOT NULL DEFAULT 'Tim AINFO',
  author_slug TEXT NOT NULL DEFAULT 'tim-ainfo',
  image_url TEXT NOT NULL DEFAULT '',
  image_caption TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','scheduled','published','archived')),
  headline INTEGER NOT NULL DEFAULT 0,
  breaking INTEGER NOT NULL DEFAULT 0,
  editor_pick INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  read_minutes INTEGER NOT NULL DEFAULT 5,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  canonical_url TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_breaking ON articles(breaking,status,published_at DESC);

CREATE TABLE IF NOT EXISTS article_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  editor_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY(editor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_article_revisions ON article_revisions(article_id,created_at DESC);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lead TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  updated_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
);
