-- Create the 'materials' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects if not already enabled (it usually is by default)
-- alter table storage.objects enable row level security; -- SKIPPING: Usually causes permission error if not superuser, and is already enabled.

-- Policy: Allow authenticated users to upload files to 'materials' bucket
create policy "Authenticated users can upload materials"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'materials' );

-- Policy: Allow public access to read files in 'materials' bucket
create policy "Public Access to materials"
on storage.objects for select
to public
using ( bucket_id = 'materials' );

-- Policy: Allow users to update their own files
create policy "Users can update own materials"
on storage.objects for update
to authenticated
using ( bucket_id = 'materials' and auth.uid() = owner );

-- Policy: Allow users to delete their own files
create policy "Users can delete own materials"
on storage.objects for delete
to authenticated
using ( bucket_id = 'materials' and auth.uid() = owner );
