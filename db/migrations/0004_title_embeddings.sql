-- Semantic search vectors. Vectors are normalized float32 arrays encoded as
-- base64 so they travel through D1 and Effect SQL without BLOB driver differences.
CREATE TABLE title_embedding (
  title_id TEXT PRIMARY KEY REFERENCES title(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dim INTEGER NOT NULL,
  vector TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX title_embedding_model_idx ON title_embedding (model);
