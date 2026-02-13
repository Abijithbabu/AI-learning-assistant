-- Insert the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

-- Set up RLS for the storage objects
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'materials' );

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'materials' and auth.role() = 'authenticated' );

-- Note: In a production app, you'd want stricter policies (only admin or course creator).
-- For now, this allows any logged-in user to upload, which matches our flow.
