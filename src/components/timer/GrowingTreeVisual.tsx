import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Tree } from '../../types';
import { TreeSVG } from '../tree/TreeSVG';
import { TreeType, getLevelForXP, getProgressToNextLevel } from '../../constants/trees';
import { COLORS, FONTS } from '../../constants/theme';

interface GrowingTreeVisualProps {
  tree: Tree | null;
  isRunning: boolean;
  isPaused: boolean;
  withering?: boolean;
  size?: number;
}

export function GrowingTreeVisual({
  tree,
  isRunning,
  isPaused,
  withering = false,
  size = 96,
}: GrowingTreeVisualProps) {
  // 1. Organik Nefes Alma / Büyüme Hareketi (Göz yormayan, 3.8s yumuşak döngü)
  const breathAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // 2. Seviye Atlama & XP Artışı Tepki Hareketi (Burst Spring)
  const burstScale = useRef(new Animated.Value(1)).current;
  const burstGlow = useRef(new Animated.Value(0)).current;

  // 3. Yükselen büyüme parçacıkları (Subtle floating sparkles)
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;

  // Önceki seviye ve XP takibi
  const prevLevelRef = useRef<number>(tree ? getLevelForXP(tree.xp) : 0);
  const prevXPRef = useRef<number>(tree?.xp ?? 0);

  // Seviye ve İlerleme Hesaplaması
  const level = tree ? getLevelForXP(tree.xp) : 0;
  const progress = tree ? getProgressToNextLevel(tree.xp) : 0;

  // Zamanlayıcı Çalışırken Yumuşak Nefes Alma Döngüsü
  useEffect(() => {
    if (isRunning) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();

      // Parçacık animasyonları
      const p1Loop = Animated.loop(
        Animated.sequence([
          Animated.timing(particle1, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      const p2Loop = Animated.loop(
        Animated.sequence([
          Animated.delay(1300),
          Animated.timing(particle2, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      p1Loop.start();
      p2Loop.start();

      return () => {
        loopRef.current?.stop();
        p1Loop.stop();
        p2Loop.stop();
      };
    } else {
      loopRef.current?.stop();
      Animated.timing(breathAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [isRunning]);

  // Seviye Atlama veya XP Kazanımı Algılama (Anlık Görsel Değişim)
  useEffect(() => {
    if (!tree) return;

    const currentLevel = getLevelForXP(tree.xp);
    const currentXP = tree.xp;

    // Seviye atladıysa coşkulu büyüme yaylanması (Burst spring)
    if (currentLevel > prevLevelRef.current) {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(burstScale, {
            toValue: 1.22,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(burstScale, {
            toValue: 1.0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(burstGlow, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(burstGlow, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (currentXP > prevXPRef.current) {
      // XP arttıysa hafif tatlı bir nabız
      Animated.sequence([
        Animated.spring(burstScale, {
          toValue: 1.08,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(burstScale, {
          toValue: 1.0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }

    prevLevelRef.current = currentLevel;
    prevXPRef.current = currentXP;
  }, [tree?.xp, tree?.level]);

  // İnterpolasyonlar
  const scale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.045], // %4.5 çok hafif, gözü yormayan büyüme
  });

  const translateY = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3], // 3px hafif havalanma
  });

  const auraOpacity = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.22], // Yumuşak yeşil hale nabzı
  });

  const auraScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  // Parçacık 1 hareketi
  const p1TranslateY = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -32],
  });
  const p1Opacity = particle1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.8, 0.7, 0],
  });

  // Parçacık 2 hareketi
  const p2TranslateY = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [12, -34],
  });
  const p2Opacity = particle2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.8, 0.7, 0],
  });

  if (!tree) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.emptyAura}>
          <Text style={styles.emptySeed}>🌱</Text>
        </View>
        <Text style={styles.emptyText}>Tohum Yok</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* 1. Yumuşak Yeşil Büyüme Halası (Aura) */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            width: size * 0.95,
            height: size * 0.95,
            borderRadius: (size * 0.95) / 2,
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      {/* 2. Seviye Atlama Coşku Parıltısı (Flash Burst Ring) */}
      <Animated.View
        style={[
          styles.burstRing,
          {
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: (size * 1.15) / 2,
            opacity: burstGlow,
            transform: [
              {
                scale: burstGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.25],
                }),
              },
            ],
          },
        ]}
      />

      {/* 3. Yükselen Minik Büyüme Parçacıkları (Floating Sparkles) */}
      {isRunning && (
        <>
          <Animated.View
            style={[
              styles.sparkle,
              {
                left: size * 0.18,
                opacity: p1Opacity,
                transform: [{ translateY: p1TranslateY }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>✨</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.sparkle,
              {
                right: size * 0.18,
                opacity: p2Opacity,
                transform: [{ translateY: p2TranslateY }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>🌱</Text>
          </Animated.View>
        </>
      )}

      {/* 4. Canlı Ağaç SVG Görseli */}
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(scale, burstScale) },
            { translateY },
          ],
        }}
      >
        <TreeSVG
          treeType={tree.tree_type as TreeType}
          level={level}
          progress={progress}
          size={size * 0.88}
          withering={withering}
          animate={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
    backgroundColor: '#52B788',
  },
  burstRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  sparkle: {
    position: 'absolute',
    bottom: 24,
    zIndex: 10,
  },
  sparkleText: {
    fontSize: 13,
  },
  emptyAura: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderStyle: 'dashed',
  },
  emptySeed: {
    fontSize: 28,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 4,
  },
});
