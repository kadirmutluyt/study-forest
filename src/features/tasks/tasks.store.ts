import { create } from 'zustand';
import { Task } from '../../types';
import { supabase } from '../../lib/supabase';

interface TasksState {
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, title: string, category: Task['category']) => Promise<void>;
  completeTask: (taskId: string) => Promise<number>; // returns XP earned
  deleteTask: (taskId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  completedTasks: [],
  loading: false,

  fetchTasks: async (userId: string) => {
    set({ loading: true });
    try {
      const [activeRes, completedRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('is_completed', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .order('completed_at', { ascending: false })
          .limit(20),
      ]);

      set({
        tasks: activeRes.data || [],
        completedTasks: completedRes.data || [],
        loading: false,
      });
    } catch (err) {
      console.warn('[fetchTasks Error]:', err);
      set({ loading: false });
    }
  },

  addTask: async (userId: string, title: string, category: Task['category']) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      user_id: userId,
      title,
      category,
      is_completed: false,
      completed_at: null,
      xp_earned: 100,
      created_at: new Date().toISOString(),
    };

    // 0ms Optimistic UI: Listeye anında ekle
    set({ tasks: [optimisticTask, ...get().tasks] });

    try {
      const { data } = await supabase
        .from('tasks')
        .insert({ user_id: userId, title, category, xp_earned: 100 })
        .select()
        .single();

      if (data) {
        const serverTask = data as Task;
        const state = get();
        const wasCompletedBeforeInsert = state.completedTasks.some((t) => t.id === tempId);

        if (wasCompletedBeforeInsert) {
          set({
            completedTasks: state.completedTasks.map((t) =>
              t.id === tempId ? { ...serverTask, is_completed: true, completed_at: t.completed_at } : t
            ),
          });
          await supabase
            .from('tasks')
            .update({ is_completed: true, completed_at: new Date().toISOString(), xp_earned: 100 })
            .eq('id', serverTask.id);
        } else {
          set({
            tasks: state.tasks.map((t) => (t.id === tempId ? serverTask : t)),
          });
        }
      }
    } catch (err) {
      console.warn('[addTask Error]:', err);
    }
  },

  completeTask: async (taskId: string) => {
    const xpEarned = 100;
    const taskToComplete = get().tasks.find((t) => t.id === taskId);

    // 0ms Optimistic UI: Listeden anında kaldır ve tamamlananlara ekle
    if (taskToComplete) {
      const completedTask: Task = {
        ...taskToComplete,
        is_completed: true,
        completed_at: new Date().toISOString(),
        xp_earned: xpEarned,
      };
      set({
        tasks: get().tasks.filter((t) => t.id !== taskId),
        completedTasks: [completedTask, ...get().completedTasks],
      });
    } else {
      set({ tasks: get().tasks.filter((t) => t.id !== taskId) });
    }

    supabase
      .from('tasks')
      .update({ is_completed: true, completed_at: new Date().toISOString(), xp_earned: xpEarned })
      .eq('id', taskId)
      .then();

    return xpEarned;
  },

  deleteTask: async (taskId: string) => {
    // 0ms Optimistic UI: Listeden anında kaldır (hem aktif hem tamamlananlar)
    set({
      tasks: get().tasks.filter((t) => t.id !== taskId),
      completedTasks: get().completedTasks.filter((t) => t.id !== taskId),
    });
    await supabase.from('tasks').delete().eq('id', taskId);
  },
}));
