import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '../../features/notification/notification.store';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export function ModernToast() {
  const insets = useSafeAreaInsets();
  const { currentToast, hideToast } = useNotificationStore();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Swipe up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -20) {
          dismissToast();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  };

  useEffect(() => {
    if (!currentToast) return;

    // Reset & Animate In
    translateY.setValue(-120);
    opacity.setValue(0);
    progressAnim.setValue(1);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: currentToast.duration || 3200,
        useNativeDriver: false, // width animation
      }),
    ]).start();

    const timer = setTimeout(() => {
      dismissToast();
    }, currentToast.duration || 3200);

    return () => clearTimeout(timer);
  }, [currentToast?.id]);

  if (!currentToast) return null;

  const isError = currentToast.type === 'error';
  const isXP = currentToast.type === 'xp' || typeof currentToast.xpAmount === 'number';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, 14) + 6,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[
          styles.container,
          isError ? styles.containerError : styles.containerSuccess,
        ]}
        onPress={dismissToast}
        activeOpacity={0.92}
      >
        {/* Sol İkon Balonu */}
        <View style={[styles.iconBox, isError ? styles.iconBoxError : styles.iconBoxSuccess]}>
          <Text style={styles.iconText}>
            {currentToast.icon || (isError ? '⚠️' : isXP ? '⚡' : '🌱')}
          </Text>
        </View>

        {/* Metin İçeriği */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {currentToast.title}
            </Text>
            {currentToast.xpAmount ? (
              <View style={styles.xpPill}>
                <Text style={styles.xpText}>+{currentToast.xpAmount} XP</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {currentToast.message}
          </Text>
        </View>

        {/* Alt Zaman Çubuğu */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: isError ? '#FF6B6B' : COLORS.secondary,
            },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 99999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 50, 36, 0.96)', // Derin lüks orman yeşili
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
    borderWidth: 1.5,
    borderColor: 'rgba(82, 183, 136, 0.45)', // Parlayan zümrüt kenarlık
    overflow: 'hidden',
    ...SHADOWS.md,
    shadowColor: '#081C15',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  containerSuccess: {
    borderColor: 'rgba(82, 183, 136, 0.5)',
  },
  containerError: {
    backgroundColor: 'rgba(45, 15, 18, 0.96)',
    borderColor: 'rgba(230, 57, 70, 0.6)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 4,
  },
  iconBoxSuccess: {
    backgroundColor: 'rgba(82, 183, 136, 0.25)',
  },
  iconBoxError: {
    backgroundColor: 'rgba(230, 57, 70, 0.25)',
  },
  iconText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
  },
  xpPill: {
    backgroundColor: '#FFE66D',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  xpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#1B4332',
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#D8F3DC',
    lineHeight: 17,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 2,
  },
});
