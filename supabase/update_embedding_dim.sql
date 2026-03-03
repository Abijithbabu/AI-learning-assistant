-- Update the embedding column to support 3072 dimensions
-- to match the output of models/gemini-embedding-001
BEGIN;
  -- Drop the index first as it depends on the column type/dimensions
  DROP INDEX IF EXISTS embeddings_embedding_idx;
  
  -- Alter the column type
  ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(3072);
  
  -- Re-create the index
  -- Index cannot be created for >2000 dimensions on current pgvector version. 
  -- We will rely on exact nearest neighbor search (sequential scan), which is fast enough for <100k rows.
  -- CREATE INDEX embeddings_embedding_idx ON embeddings USING ivfflat (embedding vector_cosine_ops);
COMMIT;
        