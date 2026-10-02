import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/features/auth/use-auth';
import { supabase } from '../../src/lib/supabase';
import { fetchUnlockedAchievements } from '../../src/features/achievements/use-achievements';
import { ACHIEVEMENTS } from '../../src/features/achievements/achievements';
import { Card } from '../../src/components/ui/Card';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';

interface Stats {
  totalTrees: number;
  totalXP: number;
  streakDays: number;
  totalSessions: number;
  totalSeconds: number;
  totalPomodoros: number;
  weeklySeconds: number[];
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function StatsScreen() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTrees: 0, totalXP: 0, streakDays: 0,
    totalSessions: 0, totalSeconds: 0, totalPomodoros: 0,
    weeklySeconds: [0, 0, 0, 0, 0, 0, 0],
  });
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    loadAll(session.user.id);
  }, [session?.user.id]);

  const loadAll = async (userId: string) => {
    setLoading(true);
    try {
      const [profileRes, treeRes, sessionsRes, achievementsRes] = await Promise.all([
        supabase.from('profiles').select('total_xp, streak_days').eq('id', userId).single(),
        supabase.from('trees').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_completed', true),
        supabase.from('study_sessions').select('mode, duration_seconds, started_at').eq('user_id', userId).eq('completed', true),
        fetchUnlockedAchievements(userId),
      ]);

      const sessions = sessionsRes.data ?? [];
      const totalSeconds = sessions.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
      const totalPomodoros = sessions.filter((s) => s.mode === 'pomodoro').length;

      const now = new Date();
      const weeklySeconds = [0, 0, 0, 0, 0, 0, 0];
      sessions.forEach((s) => {
        const d = new Date(s.started_at);
        const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 7) weeklySeconds[6 - diff] += s.duration_seconds ?? 0;
      });

      setStats({
        totalTrees: treeRes.count ?? 0,
        totalXP: profileRes.data?.total_xp ?? 0,
        streakDays: profileRes.data?.streak_days ?? 0,
        totalSessions: sessions.length,
        totalSeconds,
        totalPomodoros,
        weeklySeconds,
      });
      setUnlockedKeys(achievementsRes);
    } finally {
      setLoading(false);
    }
  };

  const maxWeekly = Math.max(...stats.weeklySeconds, 1);

  const statCards = [
    { emoji: '🌳', label: 'Tamamlanan Ağaç', value: stats.totalTrees.toString() },
    { emoji: '⚡', label: 'Toplam XP', value: stats.totalXP.toLocaleString('tr-TR') },
    { emoji: '🔥', label: 'Gün Serisi', value: `${stats.streakDays} gün` },
    { emoji: '🍅', label: 'Pomodoro', value: stats.totalPomodoros.toString() },
    { emoji: '⏱️', label: 'Toplam Çalışma', value: formatHours(stats.totalSeconds) },
    { emoji: '📅', label: 'Toplam Seans', value: stats.totalSessions.toString() },
  ];

  const unlockedCount = unlockedKeys.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>İstatistiklerim</Text>

          {loading ? (
            <Text style={styles.loading}>Yükleniyor...</Text>
          ) : (
            <>
              {/* Haftalık grafik */}
              <Card elevated style={styles.chartCard}>
                <Text style={styles.chartTitle}>📅 Haftalık Çalışma</Text>
                <View style={styles.chart}>
                  {stats.weeklySeconds.map((seconds, i) => {
                    const heightPercent = seconds / maxWeekly;
                    const isToday = i === 6;
                    return (
                      <View key={i} style={styles.barContainer}>
                        <Text style={styles.barValue}>
                          {seconds >= 3600 ? `${Math.floor(seconds / 3600)}sa`
                            : seconds >= 60 ? `${Math.floor(seconds / 60)}dk` : ''}
                        </Text>
                        <View style={styles.barTrack}>
                          <View style={[
                            styles.bar,
                            {
                              height: `${Math.max(heightPercent * 100, seconds > 0 ? 5 : 0)}%`,
                              backgroundColor: isToday ? COLORS.primary : COLORS.secondary,
                            },
                          ]} />
                        </View>
                        <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                          {DAYS[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Stat grid */}
              <View style={styles.grid}>
                {statCards.map((card) => (
                  <Card key={card.label} style={styles.statCard}>
                    <Text style={styles.statEmoji}>{card.emoji}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </Card>
                ))}
              </View>

              {/* Başarımlar */}
              <Card elevated style={styles.achievementsCard}>
                <View style={styles.achievementsHeader}>
                  <Text style={styles.achievementsTitle}>🏆 Başarımlar</Text>
                  <Text style={styles.achievementsCount}>
                    {unlockedCount}/{totalCount}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.achievementBar}>
                  <View style={[
                    styles.achievementFill,
                    { width: `${(unlockedCount / totalCount) * 100}%` },
                  ]} />
                </View>

                <View style={styles.achievementsGrid}>
                  {ACHIEVEMENTS.map((a) => {
                    const unlocked = unlockedKeys.includes(a.key);
                    return (
                      <View key={a.key} style={[styles.badge, !unlocked && styles.badgeLocked]}>
                        <Text style={[styles.badgeEmoji, !unlocked && styles.badgeEmojiLocked]}>
                          {unlocked ? a.emoji : '🔒'}
                        </Text>
                        <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]}>
                          {unlocked ? a.name : '???'}
                        </Text>
                        {unlocked && (
                          <Text style={styles.badgeDesc}>{a.description}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Motivasyon */}
              <Card style={styles.motivationCard}>
                <Text style={styles.motivationText}>
                  {stats.totalSeconds < 3600
                    ? '🌱 Her büyük orman tek bir tohumla başlar. Devam et!'
                    : stats.totalTrees === 0
                    ? '🌿 İlk ağacını büyütmeye çok yakınsın!'
                    : `🌳 ${stats.totalTrees} ağaç büyüttün. Ormanın büyüyor!`}
                </Text>
              </Card>
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scroll: { padding: SPACING.lg },
  title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text.primary, marginBottom: SPACING.lg },
  loading: { fontFamily: FONTS.body, color: COLORS.text.secondary, textAlign: 'center' },
  chartCard: { marginBottom: SPACING.md },
  chartTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text.primary, marginBottom: SPACING.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: SPACING.xs },
  barContainer: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontFamily: FONTS.body, fontSize: 9, color: COLORS.text.muted, marginBottom: 2, height: 14 },
  barTrack: { flex: 1, width: '80%', justifyContent: 'flex-end', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: RADIUS.sm, minHeight: 4 },
  barLabel: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.text.muted, marginTop: 4 },
  barLabelToday: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: SPACING.md, gap: 4 },
  statEmoji: { fontSize: 28 },
  statValue: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.text.primary },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.text.secondary, textAlign: 'center' },
  achievementsCard: { marginBottom: SPACING.md },
  achievementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  achievementsTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.text.primary },
  achievementsCount: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.accent },
  achievementBar: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, marginBottom: SPACING.md, overflow: 'hidden' },
  achievementFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.full },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: {
    width: '30%', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    gap: 3,
  },
  badgeLocked: { opacity: 0.4 },
  badgeEmoji: { fontSize: 24 },
  badgeEmojiLocked: { opacity: 0.5 },
  badgeName: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.text.primary, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.text.muted },
  badgeDesc: { fontFamily: FONTS.body, fontSize: 9, color: COLORS.text.secondary, textAlign: 'center' },
  motivationCard: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' },
  motivationText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.text.primary, textAlign: 'center', lineHeight: 22 },
});
