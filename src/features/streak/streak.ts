import { supabase } from '../../lib/supabase';

/**
 * Her çalışma seansı bitince çağrılır.
 * - last_study_date'i günceller
 * - Seriyi (streak) hesaplar ve kaydeder
 * @returns güncel streak değeri
 */
export async function updateStreak(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_days, last_study_date')
    .eq('id', userId)
    .single();

  if (!profile) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = profile.last_study_date
    ? new Date(profile.last_study_date)
    : null;

  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  let newStreak = profile.streak_days;

  if (!lastDate) {
    // İlk kez çalışıyor
    newStreak = 1;
  } else {
    const diffDays = Math.round(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Bugün zaten çalışmış, streak değişmez
    } else if (diffDays === 1) {
      // Dün de çalışmış, seri devam ediyor
      newStreak += 1;
    } else {
      // Seri koptu
      newStreak = 1;
    }
  }

  await supabase
    .from('profiles')
    .update({
      streak_days: newStreak,
      last_study_date: today.toISOString().split('T')[0],
    })
    .eq('id', userId);

  return newStreak;
}
