import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState,
  AppStateStatus, Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTimerStore, formatTime } from '../../src/features/timer/timer.store';
import { useTreeStore } from '../../src/features/tree/tree.store';
import { addXPToActiveTree, calculateFreeTimerXP } from '../../src/features/xp/xp-engine';
import { updateStreak } from '../../src/features/streak/streak';
import { checkAndUnlockAchievements } from '../../src/features/achievements/use-achievements';
import { TimerRing } from '../../src/components/timer/TimerRing';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Confetti } from '../../src/components/ui/Confetti';
import { AchievementToast } from '../../src/components/ui/AchievementToast';
import { useAuth } from '../../src/features/auth/use-auth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';
import { XP_RULES } from '../../src/constants/trees';
import { supabase } from '../../src/lib/supabase';
import { AchievementDef } from '../../src/types';
import { ACHIEVEMENTS } from '../../src/features/achievements/achievements';

const MODE_CONFIG = {
  pomodoro: { label: '🍅 Pomodoro', color: COLORS.primary },
  free: { label: '⏱️ Serbest', color: COLORS.secondary },
  goal: { label: '🎯 Hedef', color: COLORS.accent },
};

export default function TimerScreen() {
  const { session } = useAuth();
  const timer = useTimerStore();
  const { activeTree, refreshActiveTree } = useTreeStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const [withering, setWithering] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<AchievementDef | null>(null);
  const achievementQueue = useRef<AchievementDef[]>([]);

  // Queue'dan sıradaki başarımı göster
  const showNextAchievement = useCallback(() => {
    if (achievementQueue.current.length > 0) {
      const next = achievementQueue.current.shift()!;
      setPendingAchievement(next);
    }
  }, []);

  // AppState — arka plana geçince durdur
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && timer.state === 'running') {
        timer.pause();
        setWithering(true);
      }
      if (nextState === 'active' && withering) {
        setWithering(false);
      }
    });
    return () => sub.remove();
  }, [timer.state, withering]);

  // Tick
  useEffect(() => {
    if (timer.state === 'running') {
      intervalRef.current = setInterval(() => {
        timer.tick();
        const { mode, timeRemaining } = useTimerStore.getState();
        if (mode !== 'free' && timeRemaining === 0) {
          handleTimerComplete();
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer.state]);

  const gatherStats = async (userId: string) => {
    const [treesRes, sessionsRes, profileRes] = await Promise.all([
      supabase.from('trees').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_completed', true),
      supabase.from('study_sessions').select('mode, duration_seconds').eq('user_id', userId).eq('completed', true),
      supabase.from('profiles').select('streak_days').eq('id', userId).single(),
    ]);

    const totalTrees = treesRes.count ?? 0;
    const sessions = sessionsRes.data ?? [];
    const totalPomodoros = sessions.filter((s) => s.mode === 'pomodoro').length;
    const totalStudySeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
    const streakDays = profileRes.data?.streak_days ?? 0;
    const studyHour = new Date().getHours();

    return { totalTrees, totalPomodoros, totalStudySeconds, streakDays, studyHour };
  };

  const saveSession = async (userId: string, mode: string, durationSeconds: number, xpEarned: number) => {
    await supabase.from('study_sessions').insert({
      user_id: userId,
      tree_id: activeTree?.id ?? null,
      mode,
      duration_seconds: durationSeconds,
      xp_earned: xpEarned,
      completed: true,
    });
  };

  const handleTimerComplete = async () => {
    if (!session?.user.id) return;

    const { mode, elapsedSeconds } = useTimerStore.getState();
    timer.reset();

    let xp = 0;
    if (mode === 'pomodoro') xp = XP_RULES.pomodoroComplete;
    else if (mode === 'free') xp = calculateFreeTimerXP(elapsedSeconds);
    else if (mode === 'goal') xp = XP_RULES.goalComplete;

    // Seans kaydet
    await saveSession(session.user.id, mode, elapsedSeconds, xp);

    // Streak güncelle
    await updateStreak(session.user.id);

    // XP ekle
    let leveledUp = false;
    let newLevel = 0;
    let treeCompleted = false;

    if (activeTree) {
      try {
        const result = await addXPToActiveTree(session.user.id, xp);
        leveledUp = result.leveledUp;
        newLevel = result.newLevel;
        treeCompleted = result.treeCompleted;
        await refreshActiveTree(session.user.id);
      } catch {}
    }

    // Başarımları kontrol et
    const stats = await gatherStats(session.user.id);
    const newAchievements = await checkAndUnlockAchievements(session.user.id, stats);

    // Ağaç tamamlandıysa konfeti
    if (treeCompleted) {
      setShowConfetti(true);
    }

    // Başarım toast kuyruğu
    if (newAchievements.length > 0) {
      achievementQueue.current.push(...newAchievements);
      if (!pendingAchievement) showNextAchievement();
    }

    // Alert
    if (treeCompleted) {
      Alert.alert('🎉 Muhteşem!', `Ağacın tamamlandı! Ormanına eklendi.\n+${xp} XP`, [{ text: 'Harika!' }]);
    } else if (leveledUp) {
      Alert.alert(`🌳 Seviye ${newLevel}!`, `+${xp} XP kazandın!`, [{ text: 'Devam Et' }]);
    } else if (xp > 0) {
      Alert.alert('✅ Tamamlandı!', `+${xp} XP kazandın!`, [{ text: 'Devam Et' }]);
    }
  };

  const handleStop = async () => {
    const { mode, elapsedSeconds, state } = useTimerStore.getState();
    timer.reset();

    if (!session?.user.id || !activeTree) return;

    if (mode === 'pomodoro' && elapsedSeconds > 60 && state === 'running') {
      try {
        await addXPToActiveTree(session.user.id, XP_RULES.abandonPenalty);
        await refreshActiveTree(session.user.id);
        Alert.alert('😔 Vazgeçildi', `${Math.abs(XP_RULES.abandonPenalty)} XP kaybettin.`);
      } catch {}
    } else if (mode === 'free' && elapsedSeconds >= 60) {
      await handleTimerComplete();
    }
  };

  const progress = (() => {
    const { mode, timeRemaining, totalTime, elapsedSeconds } = timer;
    if (mode === 'free') return (elapsedSeconds % 60) / 60;
    if (totalTime === 0) return 0;
    return 1 - timeRemaining / totalTime;
  })();

  const displayTime = timer.mode === 'free'
    ? formatTime(timer.elapsedSeconds)
    : formatTime(timer.timeRemaining);

  const ringColor = withering ? COLORS.danger
    : timer.state === 'break' ? COLORS.secondary
    : MODE_CONFIG[timer.mode].color;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.container}>
        {/* Konfeti overlay */}
        <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />

        {/* Başarım toast */}
        <AchievementToast
          achievement={pendingAchievement}
          onDismiss={() => {
            setPendingAchievement(null);
            setTimeout(showNextAchievement, 500);
          }}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Zamanlayıcı</Text>

          {/* Mod seçici */}
          <View style={styles.modeRow}>
            {(['pomodoro', 'free', 'goal'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, timer.mode === m && styles.modeBtnActive]}
                onPress={() => timer.state === 'idle' && timer.setMode(m)}
                disabled={timer.state !== 'idle'}
              >
                <Text style={[styles.modeBtnText, timer.mode === m && styles.modeBtnTextActive]}>
                  {MODE_CONFIG[m].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Solma uyarısı */}
          {withering && (
            <View style={styles.witheringBanner}>
              <Text style={styles.witheringText}>🌿 Ağacın soluyor! Çalışmaya devam et.</Text>
            </View>
          )}

          {/* Timer halkası */}
          <View style={styles.ringContainer}>
            <TimerRing progress={progress} size={240} strokeWidth={14} color={ringColor}>
              <View style={styles.ringInner}>
                <Text style={styles.timeDisplay}>{displayTime}</Text>
                <Text style={styles.timeLabel}>
                  {timer.state === 'break' ? '☕ Mola'
                    : timer.state === 'idle' ? 'Hazır'
                    : timer.state === 'paused' ? 'Duraklatıldı'
                    : 'Çalışıyorsun 🌱'}
                </Text>
                {timer.mode === 'pomodoro' && timer.state !== 'idle' && (
                  <Text style={styles.pomodoroCount}>🍅 × {timer.pomodoroCount}</Text>
                )}
              </View>
            </TimerRing>
          </View>

          {/* Kontroller */}
          <View style={styles.controls}>
            {timer.state === 'idle' && (
              <Button
                title={activeTree ? '▶  Başlat' : '🌱 Önce ağaç dik'}
                onPress={() =>
                  activeTree
                    ? timer.start()
                    : Alert.alert('Ağaç Yok', 'Orman ekranından önce bir ağaç dik!')
                }
                size="lg"
                style={styles.mainBtn}
              />
            )}
            {timer.state === 'running' && (
              <View style={styles.btnRow}>
                <Button title="⏸  Duraklat" onPress={timer.pause} variant="secondary" style={styles.halfBtn} />
                <Button title="⏹  Bitir" onPress={handleStop} variant="ghost" style={styles.halfBtn} />
              </View>
            )}
            {timer.state === 'paused' && (
              <View style={styles.btnRow}>
                <Button title="▶  Devam Et" onPress={timer.resume} style={styles.halfBtn} />
                <Button title="⏹  Sıfırla" onPress={handleStop} variant="ghost" style={styles.halfBtn} />
              </View>
            )}
          </View>

          {/* Hedef süre seçici */}
          {timer.mode === 'goal' && timer.state === 'idle' && (
            <Card style={styles.goalPicker}>
              <Text style={styles.goalLabel}>Hedef Süre</Text>
              <View style={styles.goalOptions}>
                {[30, 60, 90, 120].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.goalOption, timer.goalDuration === min * 60 && styles.goalOptionActive]}
                    onPress={() => timer.setGoalDuration(min * 60)}
                  >
                    <Text style={[styles.goalOptionText, timer.goalDuration === min * 60 && styles.goalOptionTextActive]}>
                      {min < 60 ? `${min} dk` : `${min / 60} sa`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Aktif ağaç yok uyarısı */}
          {!activeTree && (
            <Card style={styles.noTreeCard}>
              <Text style={styles.noTreeText}>
                🌱 Zamanlayıcıyı kullanmak için önce Orman ekranından bir ağaç dik!
              </Text>
            </Card>
          )}

          {/* XP Bilgisi */}
          <Card style={styles.xpCard}>
            <Text style={styles.xpCardTitle}>XP Kazanma Rehberi</Text>
            <View style={styles.xpRow}>
              <Text style={styles.xpItem}>🍅 Pomodoro tamamla</Text>
              <Text style={styles.xpValue}>+150 XP</Text>
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpItem}>⏱️ Serbest mod (dk başı)</Text>
              <Text style={styles.xpValue}>+5 XP</Text>
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpItem}>🎯 Hedef tamamla</Text>
              <Text style={styles.xpValue}>+200 XP</Text>
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpItem}>✅ Görev tamamla</Text>
              <Text style={styles.xpValue}>+100 XP</Text>
            </View>
          </Card>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, alignItems: 'center' },
  title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text.primary, alignSelf: 'flex-start', marginBottom: SPACING.md },
  modeRow: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, padding: 3, marginBottom: SPACING.md, alignSelf: 'stretch',
  },
  modeBtn: { flex: 1, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.surface },
  modeBtnText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.muted },
  modeBtnTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
  witheringBanner: {
    backgroundColor: COLORS.danger + '20', borderRadius: RADIUS.md, padding: SPACING.sm,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.danger + '40', alignSelf: 'stretch',
  },
  witheringText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  ringContainer: { marginVertical: SPACING.md },
  ringInner: { alignItems: 'center' },
  timeDisplay: { fontFamily: FONTS.heading, fontSize: 48, color: COLORS.text.primary, letterSpacing: 2 },
  timeLabel: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  pomodoroCount: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.accent, marginTop: 4 },
  controls: { alignSelf: 'stretch', marginBottom: SPACING.md },
  mainBtn: { alignSelf: 'stretch' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  halfBtn: { flex: 1 },
  goalPicker: { alignSelf: 'stretch', marginBottom: SPACING.md },
  goalLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.text.primary, marginBottom: SPACING.sm },
  goalOptions: { flexDirection: 'row', gap: SPACING.sm },
  goalOption: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  goalOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalOptionText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.text.secondary },
  goalOptionTextActive: { color: '#fff' },
  noTreeCard: { alignSelf: 'stretch', marginBottom: SPACING.md },
  noTreeText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  xpCard: { alignSelf: 'stretch' },
  xpCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.text.primary, marginBottom: SPACING.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpItem: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary },
  xpValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.accent },
});
