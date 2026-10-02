import { create } from 'zustand';
import { Task } from '../../types';
import { supabase } from '../../lib/supabase';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, title: string, category: Task['category']) => Promise<void>;
  completeTask: (taskId: string) => Promise<number>; // returns XP earned
  deleteTask: (taskId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (userId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false });
    set({ tasks: data || [], loading: false });
  },

  addTask: async (userId: string, title: string, category: Task['category']) => {
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: userId, title, category, xp_earned: 100 })
      .select()
      .single();
    if (data) {
      set({ tasks: [data, ...get().tasks] });
    }
  },

  completeTask: async (taskId: string) => {
    const xpEarned = 100;
    await supabase
      .from('tasks')
      .update({ is_completed: true, completed_at: new Date().toISOString(), xp_earned: xpEarned })
      .eq('id', taskId);
    set({ tasks: get().tasks.filter((t) => t.id !== taskId) });
    return xpEarned;
  },

  deleteTask: async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    set({ tasks: get().tasks.filter((t) => t.id !== taskId) });
  },
}));
