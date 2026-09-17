-- AINFO V14.12: Shop ratings, reviews, discussions, replies and reactions

ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS product_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'discussion' CHECK(kind IN ('review','discussion')),
  rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  media_token TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('pending','published','hidden','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES product_comments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_comments_product ON product_comments(product_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_comments_parent ON product_comments(parent_id,created_at ASC);
CREATE INDEX IF NOT EXISTS idx_product_comments_kind ON product_comments(product_id,kind,status,created_at DESC);

CREATE TABLE IF NOT EXISTS product_comment_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reaction TEXT NOT NULL CHECK(reaction IN ('like','love','haha','wow','sad','angry')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id,user_id),
  FOREIGN KEY(comment_id) REFERENCES product_comments(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_comment_reactions_comment ON product_comment_reactions(comment_id,reaction);
