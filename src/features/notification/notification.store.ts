import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'xp' | 'achievement' | 'error';
  icon?: string;
  xpAmount?: number;
  duration?: number;
}

interface NotificationState {
  currentToast: ToastNotification | null;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentToast: null,

  showToast: (toast) => {
    // Anında fiziksel titreşim geri bildirimi
    try {
      if (toast.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (toast.type === 'xp' || toast.type === 'achievement') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}

    set({
      currentToast: {
        ...toast,
        id: Math.random().toString(36).substring(7),
      },
    });
  },

  hideToast: () => {
    set({ currentToast: null });
  },
}));
