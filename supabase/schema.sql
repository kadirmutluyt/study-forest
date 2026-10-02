-- =============================================
-- StudyForest — Supabase Database Schema
-- Supabase SQL Editor'da çalıştırın
-- =============================================

-- 1. Profiles (auth.users ile bağlı)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  total_xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trees
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tree_type TEXT NOT NULL DEFAULT 'pine',
  level INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  planted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Study Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES trees(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('pomodoro', 'free', 'goal')),
  duration_seconds INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'study' CHECK (category IN ('study', 'work', 'sport', 'hobby')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, achievement_key)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: yalnızca kendi profilinizi görebilirsiniz
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trees
CREATE POLICY "trees_all_own" ON trees FOR ALL USING (auth.uid() = user_id);

-- Study Sessions
CREATE POLICY "sessions_all_own" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "tasks_all_own" ON tasks FOR ALL USING (auth.uid() = user_id);

-- Achievements
CREATE POLICY "achievements_all_own" ON achievements FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Helper Functions
-- =============================================

-- XP artırma fonksiyonu (profiles.total_xp günceller)
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_xp = GREATEST(0, total_xp + xp_amount)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.users'da yeni kullanıcı oluşunca profile otomatik oluştur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Indexes (performans için)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_trees_user_id ON trees(user_id);
CREATE INDEX IF NOT EXISTS idx_trees_active ON trees(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id, is_completed);
