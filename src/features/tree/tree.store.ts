import { create } from 'zustand';
import { Tree } from '../../types';
import { supabase } from '../../lib/supabase';
import { ensureProfile } from '../auth/use-auth';
import { getLevelForXP } from '../../constants/trees';

export const MAP_GRID_SIZE = 30; // 30x30 = 900 parsel devasa açık dünya haritası
export const GRID_SIZE = MAP_GRID_SIZE;

// Merkezden dışa doğru halka şeklinde ilk boş parseli bulan algoritma
export function findNextSpiralParcel(
  occupied: Set<string>,
  mapSize: number = MAP_GRID_SIZE
): { x: number; y: number } {
  const center = Math.floor(mapSize / 2);
  for (let radius = 0; radius < mapSize; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === radius) {
          const x = center + dx;
          const y = center + dy;
          if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
            const key = `${x},${y}`;
            if (!occupied.has(key)) {
              return { x, y };
            }
          }
        }
      }
    }
  }
  return { x: center, y: center };
}

// Koordinatı olmayan eski ağaçları boş parsellere merkezden dışa doğru yerleştiren yardımcı
export function sanitizeTreePositions(trees: Tree[]): Tree[] {
  const occupied = new Set<string>();

  // Geçerli koordinatı olanları kaydet
  trees.forEach((t) => {
    if (
      typeof t.position_x === 'number' &&
      typeof t.position_y === 'number' &&
      t.position_x >= 0 &&
      t.position_x < MAP_GRID_SIZE &&
      t.position_y >= 0 &&
      t.position_y < MAP_GRID_SIZE
    ) {
      occupied.add(`${t.position_x},${t.position_y}`);
    }
  });

  // Koordinatı olmayanlara merkezden başlayarak ilk boş parseli ata
  return trees.map((t) => {
    if (
      typeof t.position_x === 'number' &&
      typeof t.position_y === 'number' &&
      t.position_x >= 0 &&
      t.position_x < MAP_GRID_SIZE &&
      t.position_y >= 0 &&
      t.position_y < MAP_GRID_SIZE
    ) {
      return t;
    }

    const { x, y } = findNextSpiralParcel(occupied, MAP_GRID_SIZE);
    occupied.add(`${x},${y}`);
    return { ...t, position_x: x, position_y: y };
  });
}

export interface CreateTreeResult {
  success: boolean;
  tree: Tree | null;
  error?: string;
}

export interface FeedResult {
  success: boolean;
  leveledUp: boolean;
  treeCompleted: boolean;
  newLevel: number;
  newXP: number;
}

interface TreeState {
  activeTree: Tree | null;
  completedTrees: Tree[];
  allTrees: Tree[];
  availableXP: number;
  userTotalXP: number;
  loading: boolean;
  fetchTrees: (userId: string) => Promise<void>;
  createTree: (
    userId: string,
    treeType: string,
    posX?: number,
    posY?: number
  ) => Promise<CreateTreeResult>;
  refreshActiveTree: (userId: string) => Promise<void>;
  setActiveTreeById: (userId: string, treeId: string) => Promise<void>;
  feedTreeWithXP: (
    userId: string,
    treeId: string,
    amount: number
  ) => Promise<FeedResult>;
  addAvailableXP: (amount: number) => void;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  activeTree: null,
  completedTrees: [],
  allTrees: [],
  availableXP: 0,
  userTotalXP: 0,
  loading: false,

  addAvailableXP: (amount: number) => {
    if (amount <= 0) return;
    set((state) => ({
      availableXP: state.availableXP + amount,
      userTotalXP: state.userTotalXP + amount,
    }));
  },

  fetchTrees: async (userId: string) => {
    set({ loading: true });

    try {
      const [treesRes, profileRes] = await Promise.all([
        supabase
          .from('trees')
          .select('*')
          .eq('user_id', userId)
          .order('planted_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const data = treesRes.data;
      if (data) {
        const positioned = sanitizeTreePositions(data as Tree[]);
        const active = positioned.find((t) => !t.is_completed) || null;
        const completed = positioned.filter((t) => t.is_completed || (active && t.id !== active.id));

        const currentState = get();
        const dbTotalXP = profileRes.data?.total_xp ?? 0;
        const totalXP = Math.max(dbTotalXP, currentState.userTotalXP);
        const allocatedXP = positioned.reduce((acc, t) => acc + (t.xp || 0), 0);
        const effectiveTotalXP = Math.max(totalXP, allocatedXP);
        const availableXP = Math.max(0, effectiveTotalXP - allocatedXP);

        set({
          activeTree: active,
          completedTrees: completed,
          allTrees: positioned,
          userTotalXP: effectiveTotalXP,
          availableXP: availableXP,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.warn('fetchTrees error:', err);
      set({ loading: false });
    }
  },

  createTree: async (
    userId: string,
    treeType: string,
    posX?: number,
    posY?: number
  ): Promise<CreateTreeResult> => {
    try {
      // 1. Profil kaydının varlığını doğrula (Foreign key güvenliği)
      await ensureProfile(userId);

      // 2. Mevcut aktif ağaç varsa, silmek yerine ormana güvenle arşivle
      await supabase
        .from('trees')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_completed', false);

      let finalX = posX;
      let finalY = posY;

      if (typeof finalX !== 'number' || typeof finalY !== 'number') {
        const currentTrees = get().allTrees;
        const occupied = new Set<string>();
        currentTrees.forEach((t) => {
          if (typeof t.position_x === 'number' && typeof t.position_y === 'number') {
            occupied.add(`${t.position_x},${t.position_y}`);
          }
        });
        const nextPos = findNextSpiralParcel(occupied, MAP_GRID_SIZE);
        finalX = nextPos.x;
        finalY = nextPos.y;
      }

      // 3. İlk Deneme: Koordinatlı payload ile ekle
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        tree_type: treeType,
        level: 0,
        xp: 0,
        position_x: finalX,
        position_y: finalY,
      };

      let { data, error } = await supabase
        .from('trees')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.warn(
          '[createTree] position_x/y ile ekleme başarısız oldu, temel sütunlarla deneniyor. Hata:',
          error.message
        );

        const fallbackPayload: Record<string, unknown> = {
          user_id: userId,
          tree_type: treeType,
          level: 0,
          xp: 0,
        };

        const retry = await supabase
          .from('trees')
          .insert(fallbackPayload)
          .select()
          .single();

        if (!retry.error && retry.data) {
          const treeData: Tree = {
            ...(retry.data as Tree),
            position_x: finalX,
            position_y: finalY,
          };
          await get().fetchTrees(userId);
          set((state) => ({
            activeTree: treeData,
            allTrees: state.allTrees.map((t) => (t.id === treeData.id ? treeData : t)),
          }));
          return { success: true, tree: treeData };
        } else if (retry.error) {
          console.error('[createTree Fallback Error]:', retry.error);
          return {
            success: false,
            tree: null,
            error: retry.error.message || 'Veritabanına ağaç eklenemedi.',
          };
        }
      }

      if (!data) {
        return { success: false, tree: null, error: 'Ağaç oluşturulamadı.' };
      }

      await get().fetchTrees(userId);
      return { success: true, tree: data as Tree };
    } catch (err: any) {
      console.error('[createTree Exception]:', err);
      return {
        success: false,
        tree: null,
        error: err?.message || 'Beklenmeyen bir hata oluştu.',
      };
    }
  },

  refreshActiveTree: async (userId: string) => {
    try {
      const state = get();
      if (state.allTrees.length === 0) {
        await get().fetchTrees(userId);
        return;
      }

      const [treeRes, profileRes] = await Promise.all([
        supabase
          .from('trees')
          .select('*')
          .eq('user_id', userId)
          .eq('is_completed', false)
          .order('planted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const currentState = get();
      const dbTotalXP = profileRes.data?.total_xp ?? 0;
      const totalXP = Math.max(dbTotalXP, currentState.userTotalXP);
      const allocatedXP = currentState.allTrees.reduce((acc, t) => acc + (t.xp || 0), 0);
      const effectiveTotalXP = Math.max(totalXP, allocatedXP);
      const availableXP = Math.max(0, effectiveTotalXP - allocatedXP);

      set({
        activeTree: (treeRes.data as Tree) || null,
        userTotalXP: effectiveTotalXP,
        availableXP: availableXP,
      });
    } catch (err) {
      console.warn('refreshActiveTree error:', err);
    }
  },

  setActiveTreeById: async (userId: string, treeId: string) => {
    // Tüm aktif ağaçları arşivle
    await supabase
      .from('trees')
      .update({ is_completed: true })
      .eq('user_id', userId)
      .eq('is_completed', false);

    // Seçilen ağacı aktif yap
    await supabase
      .from('trees')
      .update({ is_completed: false })
      .eq('id', treeId);

    await get().fetchTrees(userId);
  },

  feedTreeWithXP: async (userId: string, treeId: string, amount: number) => {
    const state = get();
    const tree = state.allTrees.find((t) => t.id === treeId);
    if (!tree || amount <= 0 || amount > state.availableXP) {
      return { success: false, leveledUp: false, treeCompleted: false, newLevel: 0, newXP: 0 };
    }

    const currentXP = tree.xp || 0;
    const oldLevel = getLevelForXP(currentXP);
    const newXP = currentXP + amount;
    const newLevel = getLevelForXP(newXP);
    const leveledUp = newLevel > oldLevel;
    const treeCompleted = newLevel >= 4;

    const updatedTree: Tree = {
      ...tree,
      xp: newXP,
      level: newLevel,
      is_completed: treeCompleted ? true : tree.is_completed,
      completed_at: treeCompleted && !tree.completed_at ? new Date().toISOString() : tree.completed_at,
    };

    // 0ms Anında Arayüz Tepkisi (Optimistic UI)
    const newAllTrees = state.allTrees.map((t) => (t.id === treeId ? updatedTree : t));
    const newActive = state.activeTree?.id === treeId ? updatedTree : state.activeTree;
    const newCompleted = newAllTrees.filter((t) => t.is_completed || (newActive && t.id !== newActive.id));
    const newAvailableXP = Math.max(0, state.availableXP - amount);

    set({
      allTrees: newAllTrees,
      activeTree: newActive,
      completedTrees: newCompleted,
      availableXP: newAvailableXP,
    });

    try {
      const updateData: Record<string, unknown> = {
        xp: newXP,
        level: newLevel,
      };
      if (treeCompleted && !tree.is_completed) {
        updateData.is_completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from('trees').update(updateData).eq('id', treeId);

      return {
        success: true,
        leveledUp,
        treeCompleted,
        newLevel,
        newXP,
      };
    } catch (err) {
      console.warn('feedTreeWithXP error:', err);
      await get().fetchTrees(userId);
      return { success: false, leveledUp: false, treeCompleted: false, newLevel: 0, newXP: 0 };
    }
  },
}));
