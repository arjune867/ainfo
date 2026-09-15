CREATE TABLE IF NOT EXISTS midtrans_webhook_events (
  event_key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  status_code TEXT NOT NULL DEFAULT '',
  transaction_status TEXT NOT NULL DEFAULT '',
  fraud_status TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_midtrans_events_order
ON midtrans_webhook_events(order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_midtrans_events_status
ON midtrans_webhook_events(transaction_status, received_at DESC);
