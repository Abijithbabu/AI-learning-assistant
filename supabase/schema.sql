-- Enable pgvector extension
create extension if not exists vector;

-- PROFILES
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- COURSES
create table courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  creator_id uuid references profiles(id) not null,
  is_public boolean not null default true, -- false = private (student-created)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for courses
alter table courses enable row level security;
-- Public courses visible to all; private courses only to their creator
create policy "Courses viewable by creator or if public" on courses for select using (
  is_public = true OR creator_id = auth.uid()
);
-- Any authenticated user can create a course
create policy "Authenticated users can insert courses." on courses for insert with check (
  auth.uid() IS NOT NULL
);
-- Creators can update their own courses
create policy "Creators can update their courses." on courses for update using (
  creator_id = auth.uid()
);

-- MODULES
create table modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table modules enable row level security;
create policy "Modules viewable by everyone" on modules for select using (true);
-- Any creator of the parent course can insert modules
create policy "Course creators can insert modules" on modules for insert with check (
  exists (select 1 from courses where id = modules.course_id and creator_id = auth.uid())
);

-- LESSONS
create table lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  title text not null,
  content text, -- HTML/Markdown content
  summary text,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table lessons enable row level security;
create policy "Lessons viewable by everyone" on lessons for select using (true);
-- Any creator of the parent course can insert lessons
create policy "Course creators can insert lessons" on lessons for insert with check (
  exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = lessons.module_id and c.creator_id = auth.uid()
  )
);

-- MATERIALS (Uploaded files)
create table materials (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  type text not null check (type in ('pdf', 'docx', 'text', 'video', 'youtube')),
  url text, -- Supabase Storage URL or YouTube Link
  filename text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  extracted_text_url text, -- URL to text file in storage if needed, or we might store small text in chunks
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table materials enable row level security;
create policy "Materials viewable by course creator" on materials for select using (
   exists (select 1 from courses where id = materials.course_id and creator_id = auth.uid())
);
-- Any creator of the parent course can insert materials
create policy "Course creators can insert materials" on materials for insert with check (
   exists (select 1 from courses where id = materials.course_id and creator_id = auth.uid())
);

-- EMBEDDINGS
create table embeddings (
  id uuid default gen_random_uuid() primary key,
  material_id uuid references materials(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Google Gemini text-embedding-004 is 768 dims
  chunk_index integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for vector search
create index on embeddings using hnsw (embedding vector_cosine_ops);

alter table embeddings enable row level security;
create policy "Embeddings viewable by everyone" on embeddings for select using (true);


-- CHAT HISTORY
create table chat_history (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  student_id uuid references profiles(id) not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chat_history enable row level security;
create policy "Users can view own chat history" on chat_history for select using (auth.uid() = student_id);
create policy "Users can insert own chat messages" on chat_history for insert with check (auth.uid() = student_id);
