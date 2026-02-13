-- Create the match_embeddings_by_course RPC function
-- This filters results by course_id to ensure only relevant course materials are returned
create or replace function match_embeddings_by_course (
  query_embedding vector(1536),
  filter_course_id uuid,
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
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  join materials m on e.material_id = m.id
  where m.course_id = filter_course_id
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
