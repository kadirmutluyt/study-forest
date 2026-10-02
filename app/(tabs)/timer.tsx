import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimerStore, formatTime } from '../../src/features/timer/timer.store';
import { useTreeStore } from '../../src/features/tree/tree.store';
import { awardUserXP, calculateFreeTimerXP } from '../../src/features/xp/xp-engine';
import { updateStreak } from '../../src/features/streak/streak';
import { checkAndUnlockAchievements } from '../../src/features/achievements/use-achievements';
import { TimerRing } from '../../src/components/timer/TimerRing';
import { GrowingTreeVisual } from '../../src/components/timer/GrowingTreeVisual';
import { FeedTreeModal } from '../../src/components/tree/FeedTreeModal';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Confetti } from '../../src/components/ui/Confetti';
import { AchievementToast } from '../../src/components/ui/AchievementToast';
import { useAuth } from '../../src/features/auth/use-auth';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';
import {
  XP_RULES,
  TREE_TYPES,
  TREE_STAGES,
  getLevelForXP,
  getProgressToNextLevel,
} from '../../src/constants/trees';
import { supabase } from '../../src/lib/supabase';
import { AchievementDef } from '../../src/types';
import { useNotificationStore } from '../../src/features/notification/notification.store';
import { ModernConfirmModal } from '../../src/components/ui/ModernConfirmModal';

const MODE_CONFIG = {
  pomodoro: { label: '🍅 Pomodoro', color: COLORS.primary },
  free: { label: '⏱️ Serbest', color: COLORS.secondary },
  goal: { label: '🎯 Hedef', color: COLORS.accent },
};

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const timer = useTimerStore();
  const { activeTree, refreshActiveTree, availableXP, feedTreeWithXP } = useTreeStore();
  const { showToast } = useNotificationStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const [withering, setWithering] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<AchievementDef | null>(null);
  const achievementQueue = useRef<AchievementDef[]>([]);

  const handleFeedActiveTree = async (amount: number) => {
    if (!session?.user.id || !activeTree) return;
    const res = await feedTreeWithXP(session.user.id, activeTree.id, amount);
    if (res.success) {
      if (res.treeCompleted) {
        setShowConfetti(true);
        showToast({
          type: 'achievement',
          icon: '🌲',
          title: 'Ağacın Devasa Boyuta Ulaştı!',
          message: 'Tebrikler! Ağacın 4. seviyeye ulaştı ve devasa oldu.',
        });
      } else if (res.leveledUp) {
        setShowConfetti(true);
        showToast({
          type: 'xp',
          icon: '⭐',
          title: `Seviye Atladı! (Seviye ${res.newLevel})`,
          message: 'Tebrikler! Ağacın bir sonraki aşamaya geçti.',
        });
      } else {
        showToast({
          type: 'xp',
          icon: '💧',
          title: 'Ağaç Beslendi!',
          message: `+${amount} XP aktarıldı. Büyümeye devam ediyor!`,
        });
      }
    }
  };

  // Ekran her odaklandığında (tab açıldığında) aktif ağacı Supabase'den tazele
  useFocusEffect(
    useCallback(() => {
      if (session?.user.id) {
        refreshActiveTree(session.user.id);
      }
    }, [session?.user.id])
  );

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

  // Timer tick
  useEffect(() => {
    if (timer.state === 'running' || timer.state === 'break') {
      intervalRef.current = setInterval(() => {
        timer.tick();
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.state]);

  // Seans tamamlama mantığı
  const handleComplete = async () => {
    if (!session?.user.id) return;
    const userId = session.user.id;

    let xpEarned = 0;
    const duration =
      timer.mode === 'free'
        ? timer.elapsedSeconds
        : timer.mode === 'pomodoro'
        ? 25 * 60
        : timer.goalDuration;

    if (timer.mode === 'pomodoro') {
      xpEarned = XP_RULES.pomodoroComplete;
    } else if (timer.mode === 'free') {
      xpEarned = calculateFreeTimerXP(timer.elapsedSeconds);
    } else if (timer.mode === 'goal') {
      xpEarned = XP_RULES.goalComplete;
    }

    timer.reset();

    // 1. XP'yi kullanıcı havuzuna ekle (Ağaca otomatik aktarma!)
    if (xpEarned > 0) {
      try {
        await awardUserXP(userId, xpEarned);
        await refreshActiveTree(userId);

        showToast({
          type: 'xp',
          icon: '✨',
          title: 'Seans Tamamlandı!',
          message: `+${xpEarned} XP havuzuna eklendi! Ağaçlarını dilediğince besleyebilirsin.`,
          xpAmount: xpEarned,
        });
      } catch (err) {
        console.warn('XP eklenirken hata:', err);
      }
    }

    // 2. Supabase'e seans kaydet
    try {
      await supabase.from('study_sessions').insert({
        user_id: userId,
        tree_id: activeTree?.id ?? null,
        mode: timer.mode,
        duration_seconds: duration,
        xp_earned: xpEarned,
        completed: true,
        started_at: sessionStartRef.current?.toISOString() ?? new Date().toISOString(),
      });
    } catch {}

    // 3. Streak güncelle
    try {
      await updateStreak(userId);
    } catch {}

    // 4. Başarımları kontrol et
    try {
      const [treesRes, sessionsRes, profileRes] = await Promise.all([
        supabase
          .from('trees')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_completed', true),
        supabase
          .from('study_sessions')
          .select('mode, duration_seconds')
          .eq('user_id', userId)
          .eq('completed', true),
        supabase
          .from('profiles')
          .select('streak_days')
          .eq('id', userId)
          .single(),
      ]);

      const stats = {
        totalTrees: treesRes.count ?? 0,
        totalPomodoros: (sessionsRes.data ?? []).filter((s) => s.mode === 'pomodoro').length,
        totalStudySeconds: (sessionsRes.data ?? []).reduce((a, s) => a + (s.duration_seconds ?? 0), 0),
        streakDays: profileRes.data?.streak_days ?? 0,
      };

      const newAchievements = await checkAndUnlockAchievements(userId, stats);
      if (newAchievements.length > 0) {
        achievementQueue.current.push(...newAchievements);
        if (!pendingAchievement) showNextAchievement();
      }
    } catch {}

    if (timer.mode === 'pomodoro') {
      const isLongBreak = (timer.pomodoroCount + 1) % 4 === 0;
      showToast({
        type: 'success',
        icon: '🍅',
        title: 'Pomodoro Tamamlandı!',
        message: `${isLongBreak ? '15 dakika uzun mola.' : '5 dakika dinlenme zamanı.'}`,
        xpAmount: xpEarned,
      });
      timer.startBreak();
    }
  };

  // Pomodoro/Hedef tamamlanma kontrolü
  useEffect(() => {
    if (timer.state === 'running' && timer.timeRemaining === 0) {
      handleComplete();
    }
  }, [timer.timeRemaining, timer.state]);

  const handleStart = () => {
    sessionStartRef.current = new Date();
    timer.start();
  };

  const handleStop = () => {
    setShowStopModal(true);
  };

  const confirmStop = () => {
    setShowStopModal(false);
    if (timer.mode === 'free' && timer.elapsedSeconds >= 60) {
      handleComplete();
    } else {
      timer.reset();
      showToast({
        type: 'info',
        icon: '⏱️',
        title: 'Çalışma Durduruldu',
        message: 'Zamanlayıcı sıfırlandı.',
      });
    }
  };

  // Progress hesapla
  let progress = 0;
  if (timer.mode === 'pomodoro') {
    const total = timer.state === 'break' ? 5 * 60 : 25 * 60;
    progress = 1 - timer.timeRemaining / total;
  } else if (timer.mode === 'goal') {
    progress = timer.goalDuration > 0 ? 1 - timer.timeRemaining / timer.goalDuration : 0;
  } else if (timer.mode === 'free') {
    progress = (timer.elapsedSeconds % 3600) / 3600;
  }

  const displayTime =
    timer.mode === 'free'
      ? formatTime(timer.elapsedSeconds)
      : formatTime(timer.timeRemaining);

  const ringColor = withering
    ? COLORS.danger
    : timer.state === 'break'
    ? COLORS.secondary
    : MODE_CONFIG[timer.mode].color;

  // Aktif ağaç durumu
  const level = activeTree ? getLevelForXP(activeTree.xp) : 0;
  const progressToNext = activeTree ? getProgressToNextLevel(activeTree.xp) : 0;
  const currentStage = TREE_STAGES[level];
  const nextStage = level < 4 ? TREE_STAGES[level + 1] : null;
  const treeInfo = activeTree
    ? TREE_TYPES.find((t) => t.id === activeTree.tree_type)
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
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

        {/* Modern Çalışmayı Durdurma Onay Modalı */}
        <ModernConfirmModal
          visible={showStopModal}
          icon="⏱️"
          badge="Çalışma Seansı"
          title="Çalışmayı Bitir?"
          message={
            timer.mode === 'free' && timer.elapsedSeconds >= 60
              ? 'Seansı bitirirsen kazandığın XP havuzuna eklenecektir. Kazandığın XP ile dilediğin ağacı besleyebilirsin.'
              : 'Seansı şimdi sonlandırırsan ilerlemen kaydedilmeyecek. Devam etmek istiyor musun?'
          }
          confirmText="⏱️ Evet, Bitir"
          cancelText="Çalışmaya Devam Et"
          confirmVariant={timer.mode === 'free' && timer.elapsedSeconds >= 60 ? 'primary' : 'danger'}
          onConfirm={confirmStop}
          onCancel={() => setShowStopModal(false)}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top, 16) + SPACING.xs,
              paddingBottom: Math.max(insets.bottom, 20) + SPACING.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Aktif Odak Ağacı Durum Kartı (Tıklanabilir, Orman Sekmesine Götürür) */}
          {activeTree ? (
            <TouchableOpacity
              style={styles.activeTreeCard}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.82}
            >
              <View style={styles.activeTreeHeader}>
                <View style={styles.activeTreeLeft}>
                  <Text style={styles.activeTreeEmoji}>{treeInfo?.emoji || '🌲'}</Text>
                  <View>
                    <Text style={styles.activeTreeName}>
                      {treeInfo?.name || 'Aktif Ağaç'}
                    </Text>
                    <Text style={styles.activeTreeStage}>
                      Seviye {level} • {currentStage?.name}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeTreeRight}>
                  <Text style={styles.activeTreeXP}>{activeTree.xp} XP</Text>
                  <TouchableOpacity
                    style={styles.feedQuickBtn}
                    onPress={() => setShowFeedModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.feedQuickBtnText}>
                      💧 {availableXP > 0 ? `${availableXP} XP Besle` : 'Besle'}
                    </Text>
                  </TouchableOpacity>
                  {nextStage ? (
                    <Text style={styles.activeTreeNextXP}>
                      Hedef: {nextStage.xpRequired} XP
                    </Text>
                  ) : (
                    <Text style={styles.activeTreeMaxBadge}>🏆 Devasa (Max)</Text>
                  )}
                </View>
              </View>

              {/* Seviye İlerleme Çubuğu */}
              {nextStage && (
                <View style={styles.treeProgressBar}>
                  <View
                    style={[
                      styles.treeProgressFill,
                      { width: `${Math.min(100, Math.round(progressToNext * 100))}%` },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.noActiveTreeCard}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.82}
            >
              <View style={styles.noActiveIconCircle}>
                <Text style={styles.noActiveEmoji}>🌱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noActiveTitle}>Aktif Odak Ağacın Yok</Text>
                <Text style={styles.noActiveSubtitle}>
                  Orman sekmesinden bir ağaç seçerek seanslarında büyütebilirsin →
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Timer Halkası ve Canlı Büyüyen Ağaç */}
          <View style={styles.ringContainer}>
            <TimerRing progress={progress} size={268} strokeWidth={13} color={ringColor}>
              <View style={styles.ringInner}>
                {/* 1. Canlı Büyüyen Ağaç Görseli (Göz yormayan organik nefes animasyonu) */}
                <GrowingTreeVisual
                  tree={activeTree}
                  isRunning={timer.state === 'running'}
                  isPaused={timer.state === 'paused'}
                  withering={withering}
                  size={104}
                />

                {/* 2. Dijital Zaman Göstergesi */}
                <Text style={styles.timeDisplay}>{displayTime}</Text>

                {/* 3. Durum Etiketi */}
                <View style={styles.statusPill}>
                  <Text style={styles.timeLabel}>
                    {timer.state === 'break'
                      ? '☕ Mola'
                      : timer.state === 'idle'
                      ? 'Hazır'
                      : timer.state === 'paused'
                      ? 'Duraklatıldı'
                      : 'Ağacın Büyüyor 🌱'}
                  </Text>
                  {timer.mode === 'pomodoro' && timer.state !== 'idle' && (
                    <Text style={styles.pomodoroCount}>
                      • 🍅 #{timer.pomodoroCount + 1}
                    </Text>
                  )}
                </View>
              </View>
            </TimerRing>
          </View>

          {/* Canlı XP Birikim / Kazanç Bilgisi */}
          {timer.state === 'running' && (
            <View style={styles.earningXpBanner}>
              <Text style={styles.earningXpText}>
                {timer.mode === 'pomodoro'
                  ? '⚡ Seans bittiğinde +50 XP doğrudan ağacına aktarılacak'
                  : timer.mode === 'free'
                  ? `⚡ +${calculateFreeTimerXP(timer.elapsedSeconds)} XP birikiyor (Ağacın besleniyor)`
                  : '⚡ Hedef süre bittiğinde +200 XP doğrudan ağacına aktarılacak'}
              </Text>
            </View>
          )}

          {/* Hedef modunda dakika seçici */}
          {timer.mode === 'goal' && timer.state === 'idle' && (
            <View style={styles.goalPicker}>
              <Text style={styles.goalLabel}>Hedef Süre:</Text>
              <View style={styles.goalOptions}>
                {[15, 30, 45, 60, 90].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.goalOption,
                      timer.goalDuration === mins * 60 && styles.goalOptionActive,
                    ]}
                    onPress={() => timer.setGoalDuration(mins * 60)}
                  >
                    <Text
                      style={[
                        styles.goalOptionText,
                        timer.goalDuration === mins * 60 && styles.goalOptionTextActive,
                      ]}
                    >
                      {mins} dk
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Kontrol butonları */}
          <View style={styles.controls}>
            {timer.state === 'idle' && (
              <Button
                title="Başla 🌱"
                onPress={handleStart}
                size="lg"
                style={styles.mainBtn}
              />
            )}

            {timer.state === 'running' && (
              <View style={styles.btnRow}>
                <Button
                  title="Duraklat"
                  onPress={timer.pause}
                  variant="secondary"
                  size="lg"
                  style={styles.halfBtn}
                />
                <Button
                  title="Bitir"
                  onPress={handleStop}
                  variant="danger"
                  size="lg"
                  style={styles.halfBtn}
                />
              </View>
            )}

            {timer.state === 'paused' && (
              <View style={styles.btnRow}>
                <Button
                  title="Devam Et"
                  onPress={timer.resume}
                  size="lg"
                  style={styles.halfBtn}
                />
                <Button
                  title="Bitir"
                  onPress={handleStop}
                  variant="danger"
                  size="lg"
                  style={styles.halfBtn}
                />
              </View>
            )}

            {timer.state === 'break' && (
              <Button
                title="Molayı Bitir"
                onPress={timer.reset}
                variant="secondary"
                size="lg"
                style={styles.mainBtn}
              />
            )}
          </View>

          {/* XP Bilgi kartı */}
          <Card style={styles.xpCard}>
            <Text style={styles.xpCardTitle}>💡 XP Kazanma Kuralları</Text>
            <View style={styles.xpRow}>
              <Text style={styles.xpItem}>🍅 25 dk Pomodoro</Text>
              <Text style={styles.xpValue}>+50 XP</Text>
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

        {/* Ağacı Besle Modalı */}
        <FeedTreeModal
          visible={showFeedModal}
          tree={activeTree}
          availableXP={availableXP}
          onClose={() => setShowFeedModal(false)}
          onFeed={handleFeedActiveTree}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, alignItems: 'center' },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.text.primary,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm + 2,
    alignSelf: 'stretch',
  },
  modeBtn: { flex: 1, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.surface },
  modeBtnText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.muted },
  modeBtnTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
  witheringBanner: {
    backgroundColor: COLORS.danger + '20',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    alignSelf: 'stretch',
  },
  witheringText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  activeTreeCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
    ...SHADOWS.sm,
    shadowColor: '#1B4332',
    shadowOpacity: 0.06,
    elevation: 2,
  },
  activeTreeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTreeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activeTreeEmoji: {
    fontSize: 28,
  },
  activeTreeName: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  activeTreeStage: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.primary,
  },
  activeTreeRight: {
    alignItems: 'flex-end',
  },
  activeTreeXP: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.accent,
  },
  feedQuickBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 2,
    marginBottom: 2,
  },
  feedQuickBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#2563EB',
  },
  activeTreeNextXP: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  activeTreeMaxBadge: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.accentDark,
    marginTop: 1,
  },
  treeProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.xs + 2,
  },
  treeProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  noActiveTreeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noActiveIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActiveEmoji: {
    fontSize: 20,
  },
  noActiveTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#92400E',
  },
  noActiveSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  ringContainer: {
    marginVertical: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  timeDisplay: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    color: COLORS.text.primary,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },
  timeLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  pomodoroCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  earningXpBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    alignSelf: 'center',
  },
  earningXpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
  },
  controls: { alignSelf: 'stretch', marginBottom: SPACING.md },
  mainBtn: { alignSelf: 'stretch' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  halfBtn: { flex: 1 },
  goalPicker: { alignSelf: 'stretch', marginBottom: SPACING.md },
  goalLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.text.primary, marginBottom: SPACING.sm },
  goalOptions: { flexDirection: 'row', gap: SPACING.sm },
  goalOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  goalOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalOptionText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.text.secondary },
  goalOptionTextActive: { color: '#fff' },
  xpCard: { alignSelf: 'stretch' },
  xpCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.text.primary, marginBottom: SPACING.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpItem: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary },
  xpValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.accent },
});
