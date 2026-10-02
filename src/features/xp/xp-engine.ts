import { supabase } from '../../lib/supabase';
import { XP_RULES, getLevelForXP, TREE_STAGES } from '../../constants/trees';

export async function addXPToActiveTree(userId: string, xpAmount: number): Promise<{
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  treeCompleted: boolean;
}> {
  // Get active (not completed) tree
  const { data: tree, error } = await supabase
    .from('trees')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .order('planted_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !tree) {
    throw new Error('No active tree found');
  }

  const oldLevel = getLevelForXP(tree.xp);
  const newXP = Math.max(0, tree.xp + xpAmount);
  const newLevel = getLevelForXP(newXP);
  const leveledUp = newLevel > oldLevel;
  const maxXP = TREE_STAGES[4].xpRequired;
  const treeCompleted = newXP >= maxXP;

  const updateData: Record<string, unknown> = {
    xp: newXP,
    level: newLevel,
  };

  if (treeCompleted) {
    updateData.is_completed = true;
    updateData.completed_at = new Date().toISOString();
  }

  await supabase.from('trees').update(updateData).eq('id', tree.id);

  // Update profile total XP
  if (xpAmount > 0) {
    await supabase.rpc('increment_xp', { user_id: userId, xp_amount: xpAmount });
  }

  return { newXP, newLevel, leveledUp, treeCompleted };
}

export function calculateFreeTimerXP(seconds: number): number {
  const minutes = Math.floor(seconds / 60);
  return minutes * XP_RULES.freeTimerPerMinute;
}
