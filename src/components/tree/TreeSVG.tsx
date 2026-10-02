import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { TREE_TYPES, TreeType } from '../../constants/trees';

interface TreeSVGProps {
  treeType: TreeType;
  level: number;        // 0-4
  progress: number;     // 0.0 - 1.0 within current level
  size?: number;
  withering?: boolean;
  animate?: boolean;    // trigger growth animation
}

// --- SVG path ağaç bileşenleri (tür başına) ---

function PineShape({
  level, colors, withering, growAnim,
}: {
  level: number; colors: { trunk: string; leaves: string; accent: string };
  withering: boolean; growAnim: Animated.Value;
}) {
  const op = withering ? 0.45 : 1;

  if (level === 0) return (
    <G>
      <Circle cx={60} cy={92} r={8} fill={colors.trunk} opacity={0.8} />
      <Path d="M60 84 Q57 73 53 62" stroke={colors.leaves} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={op} />
      <Ellipse cx={49} cy={58} rx={9} ry={7} fill={colors.leaves} opacity={op * 0.9} />
      <Path d="M60 78 Q64 67 68 60" stroke={colors.leaves} strokeWidth={2} fill="none" strokeLinecap="round" opacity={op} />
      <Ellipse cx={70} cy={57} rx={7} ry={5} fill={colors.accent} opacity={op * 0.85} />
    </G>
  );

  if (level === 1) return (
    <G>
      <Path d="M58 105 L58 72 Q60 68 62 72 L62 105 Z" fill={colors.trunk} />
      <Ellipse cx={60} cy={62} rx={20} ry={15} fill={colors.leaves} opacity={op * 0.9} />
      <Ellipse cx={60} cy={56} rx={14} ry={11} fill={colors.accent} opacity={op * 0.85} />
    </G>
  );

  if (level === 2) return (
    <G>
      <Path d="M57 105 L57 60 Q60 55 63 60 L63 105 Z" fill={colors.trunk} />
      <Ellipse cx={60} cy={80} rx={28} ry={11} fill={colors.leaves} opacity={op * 0.82} />
      <Ellipse cx={60} cy={63} rx={24} ry={15} fill={colors.leaves} opacity={op * 0.88} />
      <Ellipse cx={60} cy={48} rx={17} ry={13} fill={colors.accent} opacity={op * 0.9} />
    </G>
  );

  if (level === 3) return (
    <G>
      <Path d="M55 105 L55 50 Q60 44 65 50 L65 105 Z" fill={colors.trunk} />
      <Path d="M38 115 Q44 105 55 105" stroke={colors.trunk} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M82 115 Q76 105 65 105" stroke={colors.trunk} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Ellipse cx={60} cy={86} rx={34} ry={11} fill={colors.leaves} opacity={op * 0.78} />
      <Ellipse cx={60} cy={70} rx={30} ry={14} fill={colors.leaves} opacity={op * 0.84} />
      <Ellipse cx={60} cy={55} rx={23} ry={14} fill={colors.leaves} opacity={op * 0.90} />
      <Ellipse cx={60} cy={40} rx={16} ry={12} fill={colors.accent} opacity={op * 0.9} />
      <Circle cx={40} cy={75} r={5} fill={colors.accent} opacity={0.4} />
      <Circle cx={80} cy={68} r={4} fill={colors.accent} opacity={0.35} />
    </G>
  );

  // level === 4: Devasa
  return (
    <G>
      <Path d="M53 105 L53 40 Q60 33 67 40 L67 105 Z" fill={colors.trunk} />
      <Path d="M33 116 Q42 106 53 105" stroke={colors.trunk} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M87 116 Q78 106 67 105" stroke={colors.trunk} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Ellipse cx={60} cy={92} rx={40} ry={13} fill={colors.leaves} opacity={op * 0.72} />
      <Ellipse cx={60} cy={75} rx={36} ry={15} fill={colors.leaves} opacity={op * 0.80} />
      <Ellipse cx={60} cy={58} rx={29} ry={16} fill={colors.leaves} opacity={op * 0.87} />
      <Ellipse cx={60} cy={43} rx={22} ry={14} fill={colors.leaves} opacity={op * 0.92} />
      <Ellipse cx={60} cy={28} rx={14} ry={11} fill={colors.accent} opacity={op * 0.95} />
      <Circle cx={34} cy={78} r={7} fill={colors.accent} opacity={0.38} />
      <Circle cx={86} cy={72} r={6} fill={colors.accent} opacity={0.32} />
      <Circle cx={36} cy={60} r={4} fill={colors.leaves} opacity={0.5} />
      <Circle cx={84} cy={55} r={4} fill={colors.leaves} opacity={0.45} />
    </G>
  );
}

function CherryShape({
  level, colors, withering,
}: {
  level: number; colors: { trunk: string; leaves: string; accent: string };
  withering: boolean;
}) {
  const op = withering ? 0.45 : 1;

  if (level === 0) return (
    <G>
      <Circle cx={60} cy={92} r={7} fill={colors.trunk} opacity={0.8} />
      <Path d="M60 85 L60 70" stroke={colors.trunk} strokeWidth={2} />
      <Circle cx={55} cy={66} r={7} fill={colors.leaves} opacity={op * 0.9} />
      <Circle cx={65} cy={63} r={6} fill={colors.accent} opacity={op * 0.8} />
    </G>
  );

  if (level === 1) return (
    <G>
      <Path d="M59 105 L59 70 Q60 66 61 70 L61 105 Z" fill={colors.trunk} />
      <Circle cx={48} cy={62} r={14} fill={colors.leaves} opacity={op * 0.85} />
      <Circle cx={72} cy={60} r={13} fill={colors.leaves} opacity={op * 0.82} />
      <Circle cx={60} cy={55} r={12} fill={colors.accent} opacity={op * 0.8} />
    </G>
  );

  if (level === 2) return (
    <G>
      <Path d="M58 105 L58 62 Q60 57 62 62 L62 105 Z" fill={colors.trunk} />
      <Circle cx={42} cy={72} r={18} fill={colors.leaves} opacity={op * 0.82} />
      <Circle cx={78} cy={70} r={16} fill={colors.leaves} opacity={op * 0.80} />
      <Circle cx={60} cy={58} r={20} fill={colors.leaves} opacity={op * 0.85} />
      <Circle cx={60} cy={48} r={13} fill={colors.accent} opacity={op * 0.82} />
    </G>
  );

  if (level === 3) return (
    <G>
      <Path d="M56 105 L56 52 Q60 45 64 52 L64 105 Z" fill={colors.trunk} />
      <Circle cx={36} cy={76} r={20} fill={colors.leaves} opacity={op * 0.78} />
      <Circle cx={84} cy={74} r={18} fill={colors.leaves} opacity={op * 0.76} />
      <Circle cx={60} cy={62} r={24} fill={colors.leaves} opacity={op * 0.85} />
      <Circle cx={60} cy={42} r={17} fill={colors.accent} opacity={op * 0.88} />
      <Circle cx={43} cy={52} r={10} fill={colors.accent} opacity={op * 0.55} />
      <Circle cx={77} cy={50} r={9} fill={colors.accent} opacity={op * 0.50} />
    </G>
  );

  return (
    <G>
      <Path d="M54 105 L54 44 Q60 36 66 44 L66 105 Z" fill={colors.trunk} />
      <Path d="M30 116 Q40 106 54 105" stroke={colors.trunk} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M90 116 Q80 106 66 105" stroke={colors.trunk} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Circle cx={32} cy={80} r={22} fill={colors.leaves} opacity={op * 0.75} />
      <Circle cx={88} cy={77} r={20} fill={colors.leaves} opacity={op * 0.73} />
      <Circle cx={60} cy={66} r={27} fill={colors.leaves} opacity={op * 0.82} />
      <Circle cx={60} cy={38} r={20} fill={colors.accent} opacity={op * 0.90} />
      <Circle cx={42} cy={48} r={12} fill={colors.accent} opacity={op * 0.58} />
      <Circle cx={78} cy={46} r={11} fill={colors.accent} opacity={op * 0.54} />
    </G>
  );
}

function BambooShape({
  level, colors, withering,
}: {
  level: number; colors: { trunk: string; leaves: string; accent: string };
  withering: boolean;
}) {
  const op = withering ? 0.45 : 1;
  if (level === 0) return (
    <G>
      <Path d="M60 100 L60 75" stroke={colors.trunk} strokeWidth={5} strokeLinecap="round" />
      <Ellipse cx={55} cy={72} rx={8} ry={5} fill={colors.leaves} opacity={op} />
    </G>
  );
  if (level === 1) return (
    <G>
      <Path d="M58 105 L58 65" stroke={colors.trunk} strokeWidth={7} strokeLinecap="round" />
      <Path d="M62 105 L62 65" stroke={colors.accent} strokeWidth={7} strokeLinecap="round" opacity={0.5} />
      <Circle cx={58} cy={90} r={4} fill={colors.accent} />
      <Circle cx={62} cy={75} r={4} fill={colors.accent} />
      <Ellipse cx={45} cy={68} rx={14} ry={6} fill={colors.leaves} opacity={op * 0.9} />
      <Ellipse cx={75} cy={64} rx={12} ry={5} fill={colors.leaves} opacity={op * 0.85} />
    </G>
  );
  if (level === 2) return (
    <G>
      {[55, 62, 68].map((x, i) => (
        <G key={i}>
          <Path d={`M${x} 105 L${x} 50`} stroke={i % 2 === 0 ? colors.trunk : colors.accent} strokeWidth={6} strokeLinecap="round" opacity={i % 2 === 0 ? 1 : 0.6} />
          <Circle cx={x} cy={85} r={3.5} fill={colors.accent} />
          <Circle cx={x} cy={68} r={3.5} fill={colors.accent} />
        </G>
      ))}
      <Ellipse cx={40} cy={58} rx={16} ry={6} fill={colors.leaves} opacity={op * 0.88} />
      <Ellipse cx={80} cy={54} rx={14} ry={5} fill={colors.leaves} opacity={op * 0.84} />
      <Ellipse cx={60} cy={46} rx={18} ry={7} fill={colors.leaves} opacity={op * 0.9} />
    </G>
  );
  if (level === 3) return (
    <G>
      {[50, 57, 63, 70].map((x, i) => (
        <G key={i}>
          <Path d={`M${x} 105 L${x} 35`} stroke={i % 2 === 0 ? colors.trunk : colors.accent} strokeWidth={7} strokeLinecap="round" opacity={i % 2 === 0 ? 1 : 0.55} />
          {[85, 68, 52].map((y) => <Circle key={y} cx={x} cy={y} r={4} fill={colors.accent} />)}
        </G>
      ))}
      <Ellipse cx={35} cy={50} rx={18} ry={7} fill={colors.leaves} opacity={op * 0.85} />
      <Ellipse cx={85} cy={46} rx={16} ry={6} fill={colors.leaves} opacity={op * 0.82} />
      <Ellipse cx={60} cy={38} rx={22} ry={8} fill={colors.leaves} opacity={op * 0.9} />
    </G>
  );
  return (
    <G>
      {[46, 53, 60, 67, 74].map((x, i) => (
        <G key={i}>
          <Path d={`M${x} 108 L${x} 22`} stroke={i % 2 === 0 ? colors.trunk : colors.accent} strokeWidth={7} strokeLinecap="round" opacity={i % 2 === 0 ? 1 : 0.55} />
          {[88, 70, 53, 36].map((y) => <Circle key={y} cx={x} cy={y} r={4} fill={colors.accent} />)}
        </G>
      ))}
      <Ellipse cx={30} cy={44} rx={20} ry={8} fill={colors.leaves} opacity={op * 0.85} />
      <Ellipse cx={90} cy={40} rx={18} ry={7} fill={colors.leaves} opacity={op * 0.82} />
      <Ellipse cx={60} cy={28} rx={26} ry={9} fill={colors.leaves} opacity={op * 0.92} />
    </G>
  );
}

// --- Ana bileşen ---

export function TreeSVG({
  treeType,
  level,
  progress,
  size = 120,
  withering = false,
  animate = false,
}: TreeSVGProps) {
  const scaleAnim = useRef(new Animated.Value(animate ? 0.85 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [level, animate]);

  const treeInfo = TREE_TYPES.find((t) => t.id === treeType) || TREE_TYPES[0];
  const { colors } = treeInfo;

  const renderShape = () => {
    switch (treeType) {
      case 'cherry':
        return <CherryShape level={level} colors={colors} withering={withering} />;
      case 'bamboo':
        return <BambooShape level={level} colors={colors} withering={withering} />;
      default:
        return <PineShape level={level} colors={colors} withering={withering} growAnim={scaleAnim} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Zemin */}
        <Ellipse cx={60} cy={112} rx={32} ry={7} fill="#A5D6A7" opacity={0.4} />
        {renderShape()}
        {/* Solma efekti overlay */}
        {withering && (
          <Ellipse cx={60} cy={60} rx={60} ry={60} fill="#FFEB3B" opacity={0.08} />
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
