import { create } from 'zustand';
import { TimerMode, TimerState } from '../../types';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

interface TimerStore {
  mode: TimerMode;
  state: TimerState;
  timeRemaining: number; // seconds
  totalTime: number; // seconds (for progress calculation)
  elapsedSeconds: number;
  pomodoroCount: number;
  goalDuration: number; // seconds for goal mode

  setMode: (mode: TimerMode) => void;
  setGoalDuration: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  startBreak: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  mode: 'pomodoro',
  state: 'idle',
  timeRemaining: POMODORO_DURATION,
  totalTime: POMODORO_DURATION,
  elapsedSeconds: 0,
  pomodoroCount: 0,
  goalDuration: 60 * 60, // 1 hour default

  setMode: (mode) => {
    const duration =
      mode === 'pomodoro' ? POMODORO_DURATION :
      mode === 'free' ? 0 :
      get().goalDuration;
    set({
      mode,
      state: 'idle',
      timeRemaining: duration,
      totalTime: duration,
      elapsedSeconds: 0,
    });
  },

  setGoalDuration: (seconds) => {
    set({ goalDuration: seconds, timeRemaining: seconds, totalTime: seconds });
  },

  start: () => set({ state: 'running', elapsedSeconds: 0 }),
  pause: () => set({ state: 'paused' }),
  resume: () => set({ state: 'running' }),
  reset: () => {
    const { mode, goalDuration } = get();
    const duration =
      mode === 'pomodoro' ? POMODORO_DURATION :
      mode === 'free' ? 0 :
      goalDuration;
    set({ state: 'idle', timeRemaining: duration, totalTime: duration, elapsedSeconds: 0 });
  },

  tick: () => {
    const { mode, timeRemaining, elapsedSeconds, pomodoroCount } = get();
    if (mode === 'free') {
      set({ elapsedSeconds: elapsedSeconds + 1 });
      return;
    }
    if (timeRemaining <= 0) {
      if (mode === 'pomodoro') {
        set({ state: 'idle', pomodoroCount: pomodoroCount + 1 });
      } else {
        set({ state: 'idle' });
      }
      return;
    }
    set({ timeRemaining: timeRemaining - 1, elapsedSeconds: elapsedSeconds + 1 });
  },

  startBreak: () => {
    const { pomodoroCount } = get();
    const breakDuration = pomodoroCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
    set({ state: 'break', timeRemaining: breakDuration, totalTime: breakDuration });
  },
}));

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
