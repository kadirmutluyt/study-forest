import { supabase } from '../../lib/supabase';
import { XP_RULES } from '../../constants/trees';
import { useTreeStore } from '../tree/tree.store';

export interface AwardXPResult {
  treeXPAdded: boolean;
  newXP?: number;
  newLevel?: number;
  leveledUp?: boolean;
  treeCompleted?: boolean;
  newTotalXP?: number;
}

/**
 * Kullanıcı havuzuna XP kazandırır.
 * Ağaçlara otomatik olarak dağıtmaz; kullanıcı istediği ağaca kendisi aktarır.
 */
export async function awardUserXP(
  userId: string,
  xpAmount: number
): Promise<{ success: boolean; newTotalXP: number }> {
  if (xpAmount <= 0) return { success: true, newTotalXP: 0 };

  // 1. 0ms Optimistic UI: Zustand store'u anında artır
  try {
    useTreeStore.getState().addAvailableXP(xpAmount);
  } catch {}

  try {
    // 2. Önce Postgres RPC ile atomik artırmayı dene
    const { error: rpcErr } = await supabase.rpc('increment_xp', {
      user_id: userId,
      xp_amount: xpAmount,
    });

    if (!rpcErr) {
      const { data: p } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', userId)
        .maybeSingle();

      return { success: true, newTotalXP: p?.total_xp ?? xpAmount };
    }

    // 3. RPC desteklenmiyorsa veya hata verirse klasik SELECT + UPDATE / UPSERT
    const { data: prof } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', userId)
      .maybeSingle();

    const currentTotal = prof?.total_xp ?? 0;
    const newTotalXP = currentTotal + xpAmount;

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ total_xp: newTotalXP })
      .eq('id', userId)
      .select('total_xp');

    if (updateError || !updated || updated.length === 0) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: 'Ormancı',
          total_xp: newTotalXP,
          streak_days: 0,
        });

      if (upsertError) {
        console.error('[awardUserXP upsert error]:', upsertError.message);
        return { success: false, newTotalXP: currentTotal };
      }
    }

    return { success: true, newTotalXP };
  } catch (e) {
    console.warn('[awardUserXP exception]:', e);
    return { success: false, newTotalXP: 0 };
  }
}

/**
 * awardXP: Geriye dönük uyumluluk için kullanıcı havuzuna XP ekler.
 * Ağaca doğrudan aktarmaz.
 */
export async function awardXP(
  userId: string,
  xpAmount: number
): Promise<AwardXPResult> {
  const res = await awardUserXP(userId, xpAmount);
  return {
    treeXPAdded: false,
    newTotalXP: res.newTotalXP,
  };
}

/**
 * addXPToActiveTree geriye dönük uyumluluk için awardXP'yi çağırır.
 */
export async function addXPToActiveTree(
  userId: string,
  xpAmount: number
): Promise<AwardXPResult> {
  return awardXP(userId, xpAmount);
}

export function calculateFreeTimerXP(seconds: number): number {
  const minutes = Math.floor(seconds / 60);
  return minutes * XP_RULES.freeTimerPerMinute;
}
