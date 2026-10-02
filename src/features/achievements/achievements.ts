import { AchievementDef } from '../../types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first_tree',
    name: 'İlk Ağacım',
    description: 'İlk ağacını tamamladın!',
    emoji: '🌱',
    check: (s) => s.totalTrees >= 1,
  },
  {
    key: 'forest_5',
    name: 'Mini Orman',
    description: '5 ağaç tamamladın',
    emoji: '🌿',
    check: (s) => s.totalTrees >= 5,
  },
  {
    key: 'forest_10',
    name: 'Küçük Orman',
    description: '10 ağaç tamamladın',
    emoji: '🌲',
    check: (s) => s.totalTrees >= 10,
  },
  {
    key: 'streak_3',
    name: '3 Günlük Seri',
    description: '3 gün üst üste çalıştın',
    emoji: '🔥',
    check: (s) => s.streakDays >= 3,
  },
  {
    key: 'streak_7',
    name: 'Haftalık Seri',
    description: '7 gün üst üste çalıştın',
    emoji: '🔥🔥',
    check: (s) => s.streakDays >= 7,
  },
  {
    key: 'pomodoro_10',
    name: 'Odak Ustası',
    description: '10 Pomodoro tamamladın',
    emoji: '🍅',
    check: (s) => s.totalPomodoros >= 10,
  },
  {
    key: 'hours_5',
    name: 'Beş Saat',
    description: 'Toplamda 5 saat çalıştın',
    emoji: '⏰',
    check: (s) => s.totalStudySeconds >= 5 * 3600,
  },
  {
    key: 'hours_10',
    name: 'Derin Çalışma',
    description: 'Toplamda 10 saat çalıştın',
    emoji: '🏆',
    check: (s) => s.totalStudySeconds >= 10 * 3600,
  },
  {
    key: 'night_owl',
    name: 'Gece Kuşu',
    description: 'Gece 23:00\'den sonra çalıştın',
    emoji: '🦉',
    check: (s) => (s.studyHour ?? -1) >= 23,
  },
  {
    key: 'early_bird',
    name: 'Erken Kuş',
    description: 'Sabah 06:00\'dan önce çalıştın',
    emoji: '🐦',
    check: (s) => (s.studyHour ?? 99) < 6,
  },
];
