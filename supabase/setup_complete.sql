-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create Profiles Table (extends Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 3. Trigger for New Users (Auto-create Profile)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Backfill existing users (Fix for current issue)
insert into public.profiles (id, email, role)
select id, email, 'student'
from auth.users
where id not in (select id from public.profiles);

-- 5. Courses Table
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  creator_id uuid references profiles(id) not null,
  is_public boolean not null default true, -- false = private (student-created)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table courses enable row level security;
drop policy if exists "Courses are viewable by everyone." on courses;
drop policy if exists "Courses viewable by creator or if public" on courses;
create policy "Courses viewable by creator or if public" on courses for select using (
  is_public = true OR creator_id = auth.uid()
);
drop policy if exists "Admins can insert courses." on courses;
drop policy if exists "Authenticated users can insert courses." on courses;
create policy "Authenticated users can insert courses." on courses for insert with check (
  auth.uid() IS NOT NULL
);
drop policy if exists "Admins can update their courses." on courses;
drop policy if exists "Creators can update their courses." on courses;
create policy "Creators can update their courses." on courses for update using (
  creator_id = auth.uid()
);

-- 6. Modules Table
create table if not exists modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table modules enable row level security;
drop policy if exists "Modules viewable by everyone" on modules;
create policy "Modules viewable by everyone" on modules for select using (true);
drop policy if exists "Admins can insert modules" on modules;
drop policy if exists "Course creators can insert modules" on modules;
create policy "Course creators can insert modules" on modules for insert with check (
  exists (select 1 from courses where id = modules.course_id and creator_id = auth.uid())
);

-- 7. Lessons Table
create table if not exists lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  title text not null,
  content text, 
  summary text,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table lessons enable row level security;
drop policy if exists "Lessons viewable by everyone" on lessons;
create policy "Lessons viewable by everyone" on lessons for select using (true);
drop policy if exists "Admins can insert lessons" on lessons;
drop policy if exists "Course creators can insert lessons" on lessons;
create policy "Course creators can insert lessons" on lessons for insert with check (
  exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = lessons.module_id and c.creator_id = auth.uid()
  )
);

-- 8. Materials Table
create table if not exists materials (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  type text not null check (type in ('pdf', 'docx', 'text', 'video', 'youtube')),
  url text,
  filename text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  extracted_text_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table materials enable row level security;
drop policy if exists "Materials viewable by course creator" on materials;
create policy "Materials viewable by course creator" on materials for select using (
   exists (select 1 from courses where id = materials.course_id and creator_id = auth.uid())
);
drop policy if exists "Admins can insert materials" on materials;
drop policy if exists "Course creators can insert materials" on materials;
create policy "Course creators can insert materials" on materials for insert with check (
   exists (select 1 from courses where id = materials.course_id and creator_id = auth.uid())
);

-- 9. Embeddings Table
create table if not exists embeddings (
  id uuid default gen_random_uuid() primary key,
  material_id uuid references materials(id) on delete cascade not null,
  content text not null,
  embedding vector(768),
  chunk_index integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists embeddings_embedding_idx on embeddings using hnsw (embedding vector_cosine_ops);

alter table embeddings enable row level security;
drop policy if exists "Embeddings viewable by everyone" on embeddings;
create policy "Embeddings viewable by everyone" on embeddings for select using (true);

-- 10. Chat History Table
create table if not exists chat_history (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  student_id uuid references profiles(id) not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chat_history enable row level security;
drop policy if exists "Users can view own chat history" on chat_history;
create policy "Users can view own chat history" on chat_history for select using (auth.uid() = student_id);
drop policy if exists "Users can insert own chat messages" on chat_history;
create policy "Users can insert own chat messages" on chat_history for insert with check (auth.uid() = student_id);
