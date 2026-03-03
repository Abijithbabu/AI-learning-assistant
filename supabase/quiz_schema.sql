-- =============================================
-- Quiz System Database Schema (Fixed for profiles table)
-- =============================================

-- Quiz table (one or more quizzes per course)
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text,
  passing_score integer default 70, -- percentage
  time_limit integer, -- minutes (null = no limit)
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Questions table
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  question_text text not null,
  question_type text default 'multiple_choice' check (question_type in ('multiple_choice', 'true_false')),
  points integer default 1,
  order_index integer not null,
  explanation text, -- shown after answering
  created_at timestamp with time zone default now()
);

-- Answer options table
create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade not null,
  option_text text not null,
  is_correct boolean default false,
  order_index integer not null,
  created_at timestamp with time zone default now()
);

-- Student quiz attempts table
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  score integer, -- percentage
  total_points_earned integer,
  total_points_possible integer,
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  time_spent integer, -- seconds
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamp with time zone default now()
);

-- Student answers table
create table student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quiz_attempts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  selected_option_id uuid references answer_options(id) on delete set null,
  is_correct boolean,
  points_earned integer default 0,
  answered_at timestamp with time zone default now()
);

-- =============================================
-- Indexes for Performance
-- =============================================

create index idx_quizzes_course on quizzes(course_id);
create index idx_questions_quiz on questions(quiz_id);
create index idx_answer_options_question on answer_options(question_id);
create index idx_quiz_attempts_student on quiz_attempts(student_id);
create index idx_quiz_attempts_quiz on quiz_attempts(quiz_id);
create index idx_student_answers_attempt on student_answers(attempt_id);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table quiz_attempts enable row level security;
alter table student_answers enable row level security;

-- Students can view published quizzes
create policy "Students can view published quizzes"
  on quizzes for select
  using (is_published = true);

-- Admins can do everything with quizzes
create policy "Admins can manage quizzes"
  on quizzes for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Students can view questions for published quizzes
create policy "Students can view questions"
  on questions for select
  using (
    exists (
      select 1 from quizzes
      where quizzes.id = questions.quiz_id
      and quizzes.is_published = true
    )
  );

-- Admins can manage questions
create policy "Admins can manage questions"
  on questions for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Students can view answer options
create policy "Students can view answer options"
  on answer_options for select
  using (
    exists (
      select 1 from questions
      join quizzes on quizzes.id = questions.quiz_id
      where questions.id = answer_options.question_id
      and quizzes.is_published = true
    )
  );

-- Admins can manage answer options
create policy "Admins can manage answer options"
  on answer_options for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Students can create and view their own attempts
create policy "Students can create quiz attempts"
  on quiz_attempts for insert
  with check (auth.uid() = student_id);

create policy "Students can view own attempts"
  on quiz_attempts for select
  using (auth.uid() = student_id);

create policy "Students can update own attempts"
  on quiz_attempts for update
  using (auth.uid() = student_id);

-- Students can create and view their own answers
create policy "Students can create answers"
  on student_answers for insert
  with check (
    exists (
      select 1 from quiz_attempts
      where quiz_attempts.id = student_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );

create policy "Students can view own answers"
  on student_answers for select
  using (
    exists (
      select 1 from quiz_attempts
      where quiz_attempts.id = student_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );
