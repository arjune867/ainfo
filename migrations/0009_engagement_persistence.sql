ALTER TABLE comments ADD COLUMN sticker_token TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS article_view_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  visitor_hash TEXT NOT NULL,
  viewed_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id, visitor_hash, viewed_on),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_article_view_events_article_date
  ON article_view_events(article_id, viewed_on);
