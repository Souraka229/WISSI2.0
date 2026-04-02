-- QuizLive Platform Database Schema
-- Run this migration first to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teachers/Professors profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Quizzes table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  theme text,
  level text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quizzes enable row level security;

create policy "quizzes_select_own" on public.quizzes for select using (auth.uid() = user_id);
create policy "quizzes_insert_own" on public.quizzes for insert with check (auth.uid() = user_id);
create policy "quizzes_update_own" on public.quizzes for update using (auth.uid() = user_id);
create policy "quizzes_delete_own" on public.quizzes for delete using (auth.uid() = user_id);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer', 'order')),
  options jsonb, -- For MCQ: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer text not null,
  explanation text,
  time_limit integer default 30, -- seconds
  points integer default 100,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  order_index integer not null,
  created_at timestamptz default now()
);

alter table public.questions enable row level security;

create policy "questions_select" on public.questions for select using (
  exists (select 1 from public.quizzes where quizzes.id = questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "questions_insert" on public.questions for insert with check (
  exists (select 1 from public.quizzes where quizzes.id = questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "questions_update" on public.questions for update using (
  exists (select 1 from public.quizzes where quizzes.id = questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "questions_delete" on public.questions for delete using (
  exists (select 1 from public.quizzes where quizzes.id = questions.quiz_id and quizzes.user_id = auth.uid())
);

-- Sessions (Live quiz sessions)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  pin_code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'question', 'results', 'finished')),
  current_question_index integer default 0,
  scoring_mode text default 'classic' check (scoring_mode in ('classic', 'precision', 'speed')),
  reactions_enabled boolean default true,
  started_at timestamptz,
  ended_at timestamptz,
  question_started_at timestamptz,
  question_deadline_at timestamptz,
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

-- Host can do everything
create policy "sessions_select_host" on public.sessions for select using (auth.uid() = host_id);
create policy "sessions_insert_host" on public.sessions for insert with check (auth.uid() = host_id);
create policy "sessions_update_host" on public.sessions for update using (auth.uid() = host_id);
create policy "sessions_delete_host" on public.sessions for delete using (auth.uid() = host_id);

-- Anyone can select session by pin (for joining)
create policy "sessions_select_by_pin" on public.sessions for select using (true);

-- Participants (students joining a session)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  nickname text not null,
  avatar text,
  score integer default 0,
  streak integer default 0,
  max_streak integer default 0,
  joined_at timestamptz default now()
);

alter table public.participants enable row level security;

-- Anyone can read/insert participants (anonymous students)
create policy "participants_select" on public.participants for select using (true);
create policy "participants_insert" on public.participants for insert with check (true);
create policy "participants_update" on public.participants for update using (true);

-- Answers (student responses)
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  time_taken integer, -- milliseconds
  points_earned integer default 0,
  answered_at timestamptz default now()
);

alter table public.answers enable row level security;

create policy "answers_select" on public.answers for select using (true);
create policy "answers_insert" on public.answers for insert with check (true);

-- Reactions during session
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now()
);

alter table public.reactions enable row level security;

create policy "reactions_select" on public.reactions for select using (true);
create policy "reactions_insert" on public.reactions for insert with check (true);

-- Create indexes for performance
create index if not exists idx_quizzes_user_id on public.quizzes(user_id);
create index if not exists idx_questions_quiz_id on public.questions(quiz_id);
create index if not exists idx_sessions_pin_code on public.sessions(pin_code);
create index if not exists idx_sessions_host_id on public.sessions(host_id);
create index if not exists idx_participants_session_id on public.participants(session_id);
create index if not exists idx_answers_session_id on public.answers(session_id);
create index if not exists idx_answers_participant_id on public.answers(participant_id);
