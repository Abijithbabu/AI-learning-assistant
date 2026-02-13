-- Create new index for 1536 dimensions (OpenAI text-embedding-3-small)
BEGIN;
  -- Drop existing index or constraint which depends on the column
  DROP INDEX IF EXISTS embeddings_embedding_idx;
  
  -- Clear existing data as dimensions are incompatible (3072 -> 1536)
  TRUNCATE TABLE embeddings;
  
  -- Update column type
  ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(1536);
  
COMMIT;

-- Create new index
CREATE INDEX embeddings_embedding_idx ON embeddings USING hnsw (embedding vector_cosine_ops);
