-- Allow authenticated users (course creators) to insert embeddings
create policy "Enable insert for course creators" on embeddings
for insert with check (
  exists (
    select 1 
    from materials 
    join courses on materials.course_id = courses.id
    where materials.id = embeddings.material_id
    and courses.creator_id = auth.uid()
  )
);

-- Allow authenticated users to delete embeddings (useful for re-processing)
create policy "Enable delete for course creators" on embeddings
for delete using (
  exists (
    select 1 
    from materials 
    join courses on materials.course_id = courses.id
    where materials.id = embeddings.material_id
    and courses.creator_id = auth.uid()
  )
);
