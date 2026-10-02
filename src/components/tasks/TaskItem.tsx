import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const CATEGORY_CONFIG = {
  study: { emoji: '📚', label: 'Ders', color: '#4CAF50' },
  work: { emoji: '💼', label: 'İş', color: '#2196F3' },
  sport: { emoji: '🏃', label: 'Spor', color: '#FF5722' },
  hobby: { emoji: '🎨', label: 'Hobi', color: '#9C27B0' },
};

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.study;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.checkButton, { borderColor: config.color }]}
        onPress={() => onComplete(task.id)}
      >
        <Text style={{ fontSize: 12, color: config.color }}>✓</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>{task.title}</Text>
        <View style={styles.meta}>
          <Text style={[styles.category, { color: config.color }]}>
            {config.emoji} {config.label}
          </Text>
          <Text style={styles.xp}>+{task.xp_earned} XP</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  category: { fontFamily: FONTS.body, fontSize: 11 },
  xp: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  deleteBtn: { padding: 4 },
  deleteText: { color: COLORS.text.muted, fontSize: 14 },
});
