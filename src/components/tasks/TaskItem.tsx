import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const CATEGORY_CONFIG = {
  study: { emoji: '📚', label: 'Ders', color: '#2D6A4F', bg: '#D8F3DC' },
  work: { emoji: '💼', label: 'İş', color: '#1D4ED8', bg: '#DBEAFE' },
  sport: { emoji: '🏃', label: 'Spor', color: '#C2410C', bg: '#FFEDD5' },
  hobby: { emoji: '🎨', label: 'Hobi', color: '#7E22CE', bg: '#F3E8FF' },
};

interface TaskItemProps {
  task: Task;
  onComplete?: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.study;
  const isCompleted = task.is_completed;

  return (
    <View style={[styles.container, isCompleted && styles.containerCompleted]}>
      {/* Yuvarlak Check Butonu */}
      <TouchableOpacity
        style={[
          styles.checkButton,
          { borderColor: isCompleted ? '#10B981' : config.color },
          isCompleted && styles.checkButtonCompleted,
        ]}
        onPress={() => !isCompleted && onComplete && onComplete(task.id)}
        disabled={isCompleted}
        activeOpacity={0.7}
      >
        {isCompleted ? (
          <Text style={styles.checkCompletedText}>✓</Text>
        ) : (
          <View style={[styles.checkInner, { backgroundColor: config.color + '15' }]} />
        )}
      </TouchableOpacity>

      {/* Görev Başlığı ve Meta Bilgileri */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isCompleted && styles.titleCompleted]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: isCompleted ? '#F3F4F6' : config.bg },
            ]}
          >
            <Text style={styles.categoryEmoji}>{config.emoji}</Text>
            <Text
              style={[
                styles.categoryText,
                { color: isCompleted ? COLORS.text.muted : config.color },
              ]}
            >
              {config.label}
            </Text>
          </View>

          <View
            style={[
              styles.xpPill,
              isCompleted && styles.xpPillCompleted,
            ]}
          >
            <Text
              style={[
                styles.xpText,
                isCompleted && styles.xpTextCompleted,
              ]}
            >
              {isCompleted ? `✓ +${task.xp_earned} XP` : `⚡ +${task.xp_earned} XP`}
            </Text>
          </View>
        </View>
      </View>

      {/* Silme Butonu */}
      <TouchableOpacity
        onPress={() => onDelete(task.id)}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    ...SHADOWS.sm,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  containerCompleted: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.85,
  },
  checkButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 4,
  },
  checkButtonCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkCompletedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    marginTop: -1,
  },
  checkInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 11,
  },
  categoryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  xpPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  xpPillCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  xpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#92400E',
  },
  xpTextCompleted: {
    color: '#047857',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  deleteText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
});
