import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Easing,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { AchievementDef } from '../../types';

interface AchievementToastProps {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => {
      dismiss();
    }, 3500);

    return () => clearTimeout(timer);
  }, [achievement]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      translateY.setValue(-120);
      opacity.setValue(0);
      onDismiss();
    });
  };

  if (!achievement) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity style={styles.card} onPress={dismiss} activeOpacity={0.9}>
        <Text style={styles.emoji}>{achievement.emoji}</Text>
        <View style={styles.textSection}>
          <Text style={styles.label}>🏆 Başarım Açıldı!</Text>
          <Text style={styles.name}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.md,
  },
  emoji: { fontSize: 36 },
  textSection: { flex: 1 },
  label: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.accent,
    marginBottom: 2,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
});
