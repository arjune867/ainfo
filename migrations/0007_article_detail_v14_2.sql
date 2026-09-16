-- AINFO V14.2 article detail / SEO persistence upgrade
-- Safe as a one-time Wrangler D1 migration after 0001-0006.

ALTER TABLE articles ADD COLUMN content_html TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN audio_url TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE articles ADD COLUMN keywords TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN modified_at TEXT;

UPDATE articles
SET modified_at = COALESCE(modified_at, updated_at, published_at, created_at)
WHERE modified_at IS NULL OR modified_at = '';

CREATE INDEX IF NOT EXISTS idx_articles_slug_status_v142 ON articles(slug, status);
CREATE INDEX IF NOT EXISTS idx_articles_modified_v142 ON articles(status, modified_at DESC);
