import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const PARTICLE_COUNT = 60;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: 'circle' | 'rect';
  initialX: number;
}

interface ConfettiProps {
  visible: boolean;
  onDone?: () => void;
}

export function Confetti({ visible, onDone }: ConfettiProps) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => {
      const initialX = Math.random() * width;
      return {
        x: new Animated.Value(initialX),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(Math.random() * 0.6 + 0.6),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 8 + 5,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
        initialX,
      };
    })
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset positions
    particles.forEach((p) => {
      const newX = Math.random() * width;
      (p as Particle & { initialX: number }).initialX = newX;
      p.x.setValue(newX);
      p.y.setValue(-20 - Math.random() * 100);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
    });

    const animations = particles.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 30),
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: height + 40,
            duration: 2000 + Math.random() * 1500,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: p.initialX + (Math.random() - 0.5) * 200,
            duration: 2500 + Math.random() * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 6 + 3),
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1500),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );

    Animated.parallel(animations).start(() => {
      onDone?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => {
        const rotate = p.rotate.interpolate({
          inputRange: [-10, 10],
          outputRange: ['-360deg', '360deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              p.shape === 'circle' ? { borderRadius: p.size } : {},
              {
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { rotate },
                  { scale: p.scale },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
