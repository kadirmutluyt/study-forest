import { create } from 'zustand';
import { Tree } from '../../types';
import { supabase } from '../../lib/supabase';

interface TreeState {
  activeTree: Tree | null;
  completedTrees: Tree[];
  loading: boolean;
  fetchTrees: (userId: string) => Promise<void>;
  createTree: (userId: string, treeType: string) => Promise<Tree | null>;
  refreshActiveTree: (userId: string) => Promise<void>;
}

export const useTreeStore = create<TreeState>((set) => ({
  activeTree: null,
  completedTrees: [],
  loading: false,

  fetchTrees: async (userId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('trees')
      .select('*')
      .eq('user_id', userId)
      .order('planted_at', { ascending: false });

    if (data) {
      const active = data.find((t) => !t.is_completed) || null;
      const completed = data.filter((t) => t.is_completed);
      set({ activeTree: active, completedTrees: completed, loading: false });
    } else {
      set({ loading: false });
    }
  },

  createTree: async (userId: string, treeType: string) => {
    const { data, error } = await supabase
      .from('trees')
      .insert({ user_id: userId, tree_type: treeType, level: 0, xp: 0 })
      .select()
      .single();

    if (error || !data) return null;
    set({ activeTree: data });
    return data;
  },

  refreshActiveTree: async (userId: string) => {
    const { data } = await supabase
      .from('trees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('planted_at', { ascending: false })
      .limit(1)
      .single();

    set({ activeTree: data || null });
  },
}));
