import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, SafeAreaView, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/features/auth/use-auth';
import { useTasksStore } from '../../src/features/tasks/tasks.store';
import { useTreeStore } from '../../src/features/tree/tree.store';
import { addXPToActiveTree } from '../../src/features/xp/xp-engine';
import { checkAndUnlockAchievements } from '../../src/features/achievements/use-achievements';
import { ACHIEVEMENTS } from '../../src/features/achievements/achievements';
import { Confetti } from '../../src/components/ui/Confetti';
import { AchievementToast } from '../../src/components/ui/AchievementToast';
import { TaskItem } from '../../src/components/tasks/TaskItem';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Task, AchievementDef } from '../../src/types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';

const CATEGORIES: { id: Task['category']; emoji: string; label: string; color: string }[] = [
  { id: 'study', emoji: '📚', label: 'Ders', color: '#4CAF50' },
  { id: 'work', emoji: '💼', label: 'İş', color: '#2196F3' },
  { id: 'sport', emoji: '🏃', label: 'Spor', color: '#FF5722' },
  { id: 'hobby', emoji: '🎨', label: 'Hobi', color: '#9C27B0' },
];

export default function TasksScreen() {
  const { session } = useAuth();
  const { tasks, fetchTasks, addTask, completeTask, deleteTask } = useTasksStore();
  const { activeTree, refreshActiveTree } = useTreeStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Task['category']>('study');
  const [adding, setAdding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<AchievementDef | null>(null);
  const achievementQueue = useRef<AchievementDef[]>([]);

  const showNextAchievement = () => {
    if (achievementQueue.current.length > 0) {
      setPendingAchievement(achievementQueue.current.shift()!);
    }
  };

  useEffect(() => {
    if (session?.user.id) fetchTasks(session.user.id);
  }, [session?.user.id]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !session?.user.id) return;
    setAdding(true);
    await addTask(session.user.id, newTitle.trim(), selectedCategory);
    setAdding(false);
    setNewTitle('');
    setShowAddModal(false);
  };

  const handleComplete = async (taskId: string) => {
    if (!session?.user.id) return;
    const xp = await completeTask(taskId);

    if (activeTree) {
      try {
        const result = await addXPToActiveTree(session.user.id, xp);
        await refreshActiveTree(session.user.id);
        if (result.treeCompleted) {
          setShowConfetti(true);
          Alert.alert('🎉 Tebrikler!', 'Ağacın tamamlandı! Ormanına eklendi.');
        } else if (result.leveledUp) {
          Alert.alert(`🌳 Seviye Atladı! (${result.newLevel})`, `+${xp} XP kazandın!`);
        }
      } catch {}
    }

    // Başarım kontrolü
    try {
      const [treesRes, sessionsRes, profileRes] = await Promise.all([
        supabase.from('trees').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_completed', true),
        supabase.from('study_sessions').select('mode, duration_seconds').eq('user_id', session.user.id).eq('completed', true),
        supabase.from('profiles').select('streak_days').eq('id', session.user.id).single(),
      ]);
      const stats = {
        totalTrees: treesRes.count ?? 0,
        totalPomodoros: (sessionsRes.data ?? []).filter((s) => s.mode === 'pomodoro').length,
        totalStudySeconds: (sessionsRes.data ?? []).reduce((a, s) => a + (s.duration_seconds ?? 0), 0),
        streakDays: profileRes.data?.streak_days ?? 0,
      };
      const newOnes = await checkAndUnlockAchievements(session.user.id, stats);
      if (newOnes.length > 0) {
        achievementQueue.current.push(...newOnes);
        if (!pendingAchievement) showNextAchievement();
      }
    } catch {}
  };

  const handleDelete = async (taskId: string) => {
    Alert.alert('Görevi Sil', 'Bu görevi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTask(taskId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.container}>
        <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
        <AchievementToast
          achievement={pendingAchievement}
          onDismiss={() => { setPendingAchievement(null); setTimeout(showNextAchievement, 500); }}
        />
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Görevlerim</Text>
            <Text style={styles.subtitle}>{tasks.length} bekleyen görev</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Task list */}
        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Harika! Liste temiz</Text>
            <Text style={styles.emptyText}>Yeni bir görev ekleyerek ağacını büyüt!</Text>
            <Button
              title="+ Görev Ekle"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TaskItem
                task={item}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add Task Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yeni Görev</Text>

              <TextInput
                style={styles.titleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Görevi yaz..."
                placeholderTextColor={COLORS.text.muted}
                autoFocus
                multiline
                maxLength={100}
              />

              <Text style={styles.categoryLabel}>Kategori</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryBtn,
                      selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '18' },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.categoryText, selectedCategory === cat.id && { color: cat.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Card style={styles.xpPreview}>
                <Text style={styles.xpPreviewText}>
                  🌱 Tamamlayınca <Text style={styles.xpValue}>+100 XP</Text> kazanırsın!
                </Text>
              </Card>

              <View style={styles.modalButtons}>
                <Button
                  title="İptal"
                  onPress={() => { setShowAddModal(false); setNewTitle(''); }}
                  variant="ghost"
                  style={styles.modalBtn}
                />
                <Button
                  title="Ekle ✓"
                  onPress={handleAdd}
                  loading={adding}
                  disabled={!newTitle.trim()}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text.primary },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    marginTop: 4,
  },
  addButtonText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#fff' },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.text.primary },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  titleInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  categoryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  categoryEmoji: { fontSize: 18 },
  categoryText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
  },
  xpPreview: { marginBottom: SPACING.md, backgroundColor: COLORS.surfaceAlt },
  xpPreviewText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  xpValue: { fontFamily: FONTS.bodyBold, color: COLORS.accent },
  modalButtons: { flexDirection: 'row', gap: SPACING.sm },
  modalBtn: { flex: 1 },
});
