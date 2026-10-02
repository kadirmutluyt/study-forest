export interface Profile {
  id: string;
  username: string | null;
  total_xp: number;
  streak_days: number;
  last_study_date: string | null;
  created_at: string;
}

export interface Tree {
  id: string;
  user_id: string;
  tree_type: string;
  level: number;
  xp: number;
  is_completed: boolean;
  planted_at: string;
  completed_at: string | null;
  position_x?: number | null;
  position_y?: number | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  tree_id: string | null;
  mode: 'pomodoro' | 'free' | 'goal';
  duration_seconds: number;
  xp_earned: number;
  completed: boolean;
  started_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: 'study' | 'work' | 'sport' | 'hobby';
  is_completed: boolean;
  completed_at: string | null;
  xp_earned: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export type TimerMode = 'pomodoro' | 'free' | 'goal';
export type TimerState = 'idle' | 'running' | 'paused' | 'break';

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalTrees: number;
  totalPomodoros: number;
  totalStudySeconds: number;
  streakDays: number;
  studyHour?: number;
}
