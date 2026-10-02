import { supabase } from '../../lib/supabase';
import { AchievementStats } from '../../types';
import { ACHIEVEMENTS } from './achievements';

/**
 * Kullanıcının başarımlarını kontrol eder ve
 * yeni açılacak olanları Supabase'e kaydeder.
 * @returns Yeni açılan başarımların listesi
 */
export async function checkAndUnlockAchievements(
  userId: string,
  stats: AchievementStats
): Promise<typeof ACHIEVEMENTS> {
  // Mevcut açılmış başarımları çek
  const { data: existing } = await supabase
    .from('achievements')
    .select('achievement_key')
    .eq('user_id', userId);

  const existingKeys = new Set((existing || []).map((a) => a.achievement_key));

  // Hangileri yeni açılıyor?
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !existingKeys.has(a.key) && a.check(stats)
  );

  if (newlyUnlocked.length > 0) {
    await supabase.from('achievements').insert(
      newlyUnlocked.map((a) => ({
        user_id: userId,
        achievement_key: a.key,
      }))
    );
  }

  return newlyUnlocked;
}

/** Kullanıcının tüm açılmış başarımlarını getirir */
export async function fetchUnlockedAchievements(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('achievements')
    .select('achievement_key')
    .eq('user_id', userId);
  return (data || []).map((a) => a.achievement_key);
}
