import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/use-auth';
import { useTasksStore } from '../../src/features/tasks/tasks.store';
import { useTreeStore } from '../../src/features/tree/tree.store';
import { useNotificationStore } from '../../src/features/notification/notification.store';
import { awardUserXP } from '../../src/features/xp/xp-engine';
import { checkAndUnlockAchievements } from '../../src/features/achievements/use-achievements';
import { Confetti } from '../../src/components/ui/Confetti';
import { TaskItem } from '../../src/components/tasks/TaskItem';
import { Button } from '../../src/components/ui/Button';
import { Task } from '../../src/types';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';

const CATEGORIES: { id: Task['category']; emoji: string; label: string; color: string; bg: string }[] = [
  { id: 'study', emoji: '📚', label: 'Ders', color: '#2D6A4F', bg: '#D8F3DC' },
  { id: 'work', emoji: '💼', label: 'İş', color: '#1D4ED8', bg: '#DBEAFE' },
  { id: 'sport', emoji: '🏃', label: 'Spor', color: '#C2410C', bg: '#FFEDD5' },
  { id: 'hobby', emoji: '🎨', label: 'Hobi', color: '#7E22CE', bg: '#F3E8FF' },
];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { tasks, completedTasks, fetchTasks, addTask, completeTask, deleteTask } = useTasksStore();
  const { refreshActiveTree, addAvailableXP, fetchTrees, availableXP } = useTreeStore();
  const { showToast } = useNotificationStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Task['category']>('study');
  const [showConfetti, setShowConfetti] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (session?.user.id) {
        fetchTasks(session.user.id);
        fetchTrees(session.user.id);
      }
    }, [session?.user.id])
  );

  // 0ms Anında Görev Ekleme
  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title || !session?.user.id) return;

    // 1. Modalı anında kapat ve inputu temizle (0ms gecikme)
    setShowAddModal(false);
    setNewTitle('');

    // 2. Modern bildirim göster
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    showToast({
      type: 'success',
      icon: cat?.emoji || '✅',
      title: 'Görev Eklendi!',
      message: `"${title}" listenize eklendi.`,
    });

    // 3. Store ve Veritabanı ekleme
    addTask(session.user.id, title, selectedCategory);
  };

  // 0ms Anında Görev Tamamlama
  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.is_completed) return;

    const xp = task.xp_earned ?? 100;

    // 1. Listeden anında kaldır ve modern bildirimi göster
    completeTask(taskId);

    // 2. 0ms Optimistic UI: Kullanıcı XP havuzuna anında ekle
    addAvailableXP(xp);

    showToast({
      type: 'xp',
      icon: '✨',
      title: 'Görev Tamamlandı!',
      message: `+${xp} XP kazandın ve havuzuna eklendi! Ağaçlarını dilediğince besleyebilirsin.`,
      xpAmount: xp,
    });

    // 3. Arka planda XP motorunu ve başarımları çalıştır
    if (session?.user.id) {
      awardUserXP(session.user.id, xp)
        .then(() => {
          refreshActiveTree(session.user.id);
        })
        .catch((err) => console.warn('XP ekleme hatası:', err));

      // Başarım kontrolü
      Promise.all([
        supabase
          .from('trees')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_completed', true),
        supabase
          .from('study_sessions')
          .select('mode, duration_seconds')
          .eq('user_id', session.user.id)
          .eq('completed', true),
        supabase
          .from('profiles')
          .select('streak_days')
          .eq('id', session.user.id)
          .single(),
      ])
        .then(([treesRes, sessionsRes, profileRes]) => {
          const stats = {
            totalTrees: treesRes.count ?? 0,
            totalPomodoros: (sessionsRes.data ?? []).filter((s) => s.mode === 'pomodoro').length,
            totalStudySeconds: (sessionsRes.data ?? []).reduce((a, s) => a + (s.duration_seconds ?? 0), 0),
            streakDays: profileRes.data?.streak_days ?? 0,
          };
          return checkAndUnlockAchievements(session.user.id, stats);
        })
        .then((newAchievements) => {
          if (newAchievements && newAchievements.length > 0) {
            const first = newAchievements[0];
            showToast({
              type: 'achievement',
              icon: first.emoji,
              title: `🏆 ${first.name}`,
              message: first.description,
            });
          }
        })
        .catch(() => {});
    }
  };

  // 0ms Görev Silme
  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
    showToast({
      type: 'info',
      icon: '🗑️',
      title: 'Görev Silindi',
      message: 'Görev listenizden kaldırıldı.',
    });
  };

  const totalCompletedXP = completedTasks.reduce(
    (acc, t) => acc + (t.xp_earned || 100),
    0
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
        <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />

        {/* Modern Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + SPACING.xs }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Görevler</Text>
            <Text style={styles.subtitle}>
              {tasks.length === 0 && completedTasks.length > 0
                ? '🎉 Harika! Tüm hedefler tamamlandı'
                : tasks.length > 0
                ? `${tasks.length} aktif görev${completedTasks.length > 0 ? ` • ${completedTasks.length} bitti` : ''}`
                : 'Günün görevlerini planla'}
            </Text>
          </View>
        </View>

        {/* Ekranın Tam Ortasında Kazanılan XP Göstergesi */}
        {completedTasks.length > 0 && (
          <View style={styles.centerXPHeaderWrapper}>
            <View style={styles.centerXPHeaderPill}>
              <Text style={styles.centerXPHeaderIcon}>⚡</Text>
              <Text style={styles.centerXPHeaderText}>
                Görevlerden Kazanılan: +{totalCompletedXP} XP
              </Text>
              <View style={styles.centerDivider} />
              <Text style={styles.centerPoolText}>
                💧 Havuz: {availableXP} XP
              </Text>
            </View>
          </View>
        )}

        {/* Ana İçerik */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* 1. Başlangıç Durumu: Hiç görev eklenmemiş */}
          {tasks.length === 0 && completedTasks.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyEmoji}>📋</Text>
              </View>
              <Text style={styles.emptyTitle}>Günün Görevlerini Belirle</Text>
              <Text style={styles.emptyText}>
                Bugün yapacaklarını ekle, tamamladıkça havuzuna +100 XP kazandır!
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyAddBtnText}>＋ İlk Görevini Ekle</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 2. Kutlama Durumu: Tüm görevler tamamlandı */}
          {tasks.length === 0 && completedTasks.length > 0 && (
            <View style={styles.celebrationCard}>
              <View style={styles.celebrationIconCircle}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
              </View>
              <Text style={styles.celebrationTitle}>Tüm Görevler Tamamlandı!</Text>
              <Text style={styles.celebrationText}>
                Harika bir odaklanma sergiledin! Bugün belirlediğin tüm görevleri bitirdin ve havuzuna bolca XP kazandırdın.
              </Text>
              <View style={styles.celebrationBadgeRow}>
                <View style={styles.celebrationXpPill}>
                  <Text style={styles.celebrationXpText}>
                    ✨ +{totalCompletedXP} XP Havuzuna Aktarıldı
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 3. Aktif Görevler Listesi */}
          {tasks.length > 0 && (
            <View style={styles.sectionContainer}>
              {completedTasks.length > 0 && (
                <Text style={styles.sectionTitle}>
                  Aktif Görevler ({tasks.length})
                </Text>
              )}
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => handleComplete(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </View>
          )}

          {/* 4. Tamamlanan Görevler Listesi */}
          {completedTasks.length > 0 && (
            <View style={[styles.sectionContainer, { marginTop: tasks.length > 0 ? SPACING.md : SPACING.sm }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Tamamlananlar ({completedTasks.length})
                </Text>
                <View style={styles.doneCountBadge}>
                  <Text style={styles.doneCountText}>✓ {completedTasks.length} Tamamlandı</Text>
                </View>
              </View>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Alt Yeni Görev Ekle Butonu (Modern & Kolay Erişilebilir) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomAddButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.bottomAddButtonIcon}>＋</Text>
            <Text style={styles.bottomAddButtonText}>Yeni Görev Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Modern Yeni Görev Modalı (Bottom Sheet) */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 20) + SPACING.md },
              ]}
            >
              {/* Drag Handle Çubuğu */}
              <View style={styles.dragPill} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>✨ Yeni Görev Ekle</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.titleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Örn: Biyoloji 3. ünite soru çözümü"
                placeholderTextColor={COLORS.text.muted}
                autoFocus
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />

              <Text style={styles.categoryLabel}>Kategori Seçimi</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryBtn,
                        isSelected && {
                          backgroundColor: cat.color,
                          borderColor: cat.color,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryText,
                          isSelected && styles.categoryTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title="✨ Görevi Ekle (+100 XP)"
                onPress={handleAdd}
                disabled={!newTitle.trim()}
                size="lg"
                style={{ marginTop: SPACING.xs }}
              />
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  centerXPHeaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  centerXPHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    gap: 6,
    ...SHADOWS.sm,
    shadowColor: '#059669',
    shadowOpacity: 0.1,
  },
  centerXPHeaderIcon: {
    fontSize: 14,
  },
  centerXPHeaderText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#047857',
  },
  centerDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#A7F3D0',
    marginHorizontal: 4,
  },
  centerPoolText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#0284C7',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
  },
  sectionContainer: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs + 2,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doneCountBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  doneCountText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#2D6A4F',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  emptyAddBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  emptyAddBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: '#D8F3DC',
    ...SHADOWS.sm,
    shadowColor: '#1B4332',
    shadowOpacity: 0.08,
  },
  celebrationIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D8F3DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  celebrationEmoji: {
    fontSize: 32,
  },
  celebrationTitle: {
    fontFamily: FONTS.heading,
    fontSize: 19,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  celebrationText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  celebrationBadgeRow: {
    flexDirection: 'row',
  },
  celebrationXpPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  celebrationXpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#047857',
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm + 4,
    backgroundColor: 'transparent',
  },
  bottomAddButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    ...SHADOWS.md,
    shadowColor: '#1B4332',
    elevation: 4,
  },
  bottomAddButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
  },
  bottomAddButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 4,
    borderTopRightRadius: RADIUS.xl + 4,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm + 4,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#6B7280',
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  categoryLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs + 2,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.lg,
  },
  categoryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 3,
  },
  categoryText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#4B5563',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyBold,
  },
});
