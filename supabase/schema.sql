-- =============================================
-- StudyForest — Supabase Database Schema (Idempotent & Safe)
-- =============================================

-- 1. Profiles (auth.users ile bağlı)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  total_xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trees
CREATE TABLE IF NOT EXISTS public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tree_type TEXT NOT NULL DEFAULT 'pine',
  level INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  planted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  position_x INTEGER,
  position_y INTEGER
);

ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS position_x INTEGER;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS position_y INTEGER;

-- 3. Study Sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('pomodoro', 'free', 'goal')),
  duration_seconds INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'study' CHECK (category IN ('study', 'work', 'sport', 'hobby')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, achievement_key)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trees Policies
DROP POLICY IF EXISTS "trees_all_own" ON public.trees;
CREATE POLICY "trees_all_own" ON public.trees FOR ALL USING (auth.uid() = user_id);

-- Study Sessions Policies
DROP POLICY IF EXISTS "sessions_all_own" ON public.study_sessions;
CREATE POLICY "sessions_all_own" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

-- Tasks Policies
DROP POLICY IF EXISTS "tasks_all_own" ON public.tasks;
CREATE POLICY "tasks_all_own" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Achievements Policies
DROP POLICY IF EXISTS "achievements_all_own" ON public.achievements;
CREATE POLICY "achievements_all_own" ON public.achievements FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Helper Functions & Triggers
-- =============================================

-- XP artırma fonksiyonu
CREATE OR REPLACE FUNCTION public.increment_xp(user_id UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = GREATEST(0, total_xp + xp_amount)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Yeni kullanıcı (E-posta, Google, Misafir/Anonim) kaydında profil oluşturan tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
BEGIN
  -- Meta verilerden kullanıcı adını al, yoksa varsayılan ata
  extracted_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    CASE WHEN (NEW.is_anonymous IS TRUE) THEN 'Misafir Ormancı' ELSE 'Ormancı' END
  );

  INSERT INTO public.profiles (id, username, total_xp, streak_days)
  VALUES (NEW.id, extracted_username, 0, 0)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Olası bir hatada kullanıcı kaydının (auth) çökmesini engelle
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Tetikleyiciyi bağla
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_trees_user_id ON public.trees(user_id);
CREATE INDEX IF NOT EXISTS idx_trees_active ON public.trees(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id, is_completed);
