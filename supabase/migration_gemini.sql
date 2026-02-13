-- 1. Truncate embeddings table (since we are changing dimensions, old embeddings are invalid)
truncate table embeddings;

-- 2. Alter the embedding column to 768 dimensions
alter table embeddings 
alter column embedding type vector(768);

-- 3. Update the match_embeddings function to accept 768 dimensions
create or replace function match_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    embeddings.id,
    embeddings.content,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
