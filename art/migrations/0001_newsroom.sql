PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS art_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'EDITOR' CHECK(role IN ('ADMIN','EDITOR')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('ACTIVE','PENDING','SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS art_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  slug TEXT DEFAULT '',
  primary_keyword TEXT DEFAULT '',
  secondary_keywords TEXT DEFAULT '[]',
  article_markdown TEXT NOT NULL DEFAULT '',
  seo_checklist TEXT DEFAULT '[]',
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  generation_mode TEXT DEFAULT 'SOURCE',
  source_urls TEXT DEFAULT '[]',
  source_text TEXT DEFAULT '',
  facts TEXT DEFAULT '[]',
  conflicts TEXT DEFAULT '[]',
  author_id TEXT DEFAULT '',
  author_name TEXT DEFAULT '',
  category TEXT DEFAULT '',
  thumbnail_key TEXT DEFAULT '',
  fact_report TEXT DEFAULT '',
  scheduled_at TEXT DEFAULT '',
  publish_destination TEXT DEFAULT '',
  published_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_art_articles_owner_status ON art_articles(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_art_articles_slug ON art_articles(slug);
CREATE INDEX IF NOT EXISTS idx_art_articles_updated ON art_articles(updated_at DESC);

CREATE TABLE IF NOT EXISTS art_article_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  owner_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(article_id) REFERENCES art_articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_art_revisions_article ON art_article_revisions(article_id, created_at DESC);

CREATE TABLE IF NOT EXISTS art_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER,
  url TEXT NOT NULL,
  domain TEXT DEFAULT '',
  title TEXT DEFAULT '',
  source_type TEXT DEFAULT 'SECONDARY',
  source_text TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(article_id) REFERENCES art_articles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS art_authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Reporter',
  email TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS art_prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ALL',
  instruction TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS art_publish_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  owner_user_id TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT 'AINFO',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(article_id) REFERENCES art_articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_art_publish_jobs_due ON art_publish_jobs(status, scheduled_at);

CREATE TABLE IF NOT EXISTS art_ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  task TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  input_units INTEGER NOT NULL DEFAULT 0,
  output_units INTEGER NOT NULL DEFAULT 0,
  error_code TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS art_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
