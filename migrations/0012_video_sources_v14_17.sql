-- AINFO V14.17 - Multi Source Video Engine

CREATE TABLE IF NOT EXISTS video_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK(provider IN ('youtube','tiktok','dailymotion','ainfo')),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'channel',
  external_id TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,source_type,external_id)
);
CREATE INDEX IF NOT EXISTS idx_video_sources_enabled ON video_sources(enabled,provider);

CREATE TABLE IF NOT EXISTS video_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK(provider IN ('youtube','tiktok','dailymotion','ainfo')),
  external_id TEXT NOT NULL,
  source_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'video' CHECK(kind IN ('short','video','live')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  embed_url TEXT NOT NULL DEFAULT '',
  watch_url TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL DEFAULT '',
  author_url TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('review','published','hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_id) REFERENCES video_sources(id) ON DELETE SET NULL,
  UNIQUE(provider,external_id)
);
CREATE INDEX IF NOT EXISTS idx_video_catalog_feed ON video_catalog(status,published_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_video_catalog_source ON video_catalog(source_id,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_catalog_provider ON video_catalog(provider,status,published_at DESC);

CREATE TABLE IF NOT EXISTS video_oauth_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL UNIQUE CHECK(provider IN ('tiktok')),
  subject_id TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  refresh_expires_at TEXT,
  scopes TEXT NOT NULL DEFAULT '',
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_id) REFERENCES video_sources(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_video_sync_log_source ON video_sync_log(source_id,created_at DESC);
