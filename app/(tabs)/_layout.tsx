import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../../src/constants/theme';

// --- Bespoke Modern SVG Tab Icons ---

function ForestTabIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Tree trunk */}
      <Rect
        x={10.75}
        y={16.5}
        width={2.5}
        height={4.5}
        rx={1}
        fill={focused ? '#795548' : color}
        opacity={focused ? 0.9 : 0.6}
      />
      {/* Tree foliage tiers */}
      <Path
        d="M12 3.5L6.5 10.5H9L5.5 15.5H18.5L15 10.5H17.5L12 3.5Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {focused && (
        <>
          {/* Subtle vertical center leaf vein */}
          <Path
            d="M12 6V15"
            stroke="#A7F3D0"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.8}
          />
          {/* Subtle branch accents */}
          <Path
            d="M12 10.5L14 9M12 13L10 11.5"
            stroke="#A7F3D0"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.8}
          />
        </>
      )}
    </Svg>
  );
}

function TimerTabIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Top crown button */}
      <Path
        d="M12 2V4.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 2H14.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Side lap trigger */}
      <Path
        d="M18.5 6.2L17.2 7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Main clock dial */}
      <Circle
        cx={12}
        cy={13.5}
        r={7.5}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      {/* Clock hands */}
      <Path
        d="M12 9.5V13.5L14.8 15"
        stroke={focused ? '#FFFFFF' : color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center pivot */}
      <Circle
        cx={12}
        cy={13.5}
        r={1.2}
        fill={focused ? '#A7F3D0' : color}
      />
    </Svg>
  );
}

function TasksTabIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Card body */}
      <Rect
        x={4}
        y={4}
        width={16}
        height={16.5}
        rx={4.5}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      {/* Top clipboard clip */}
      <Rect
        x={8.5}
        y={2}
        width={7}
        height={3.5}
        rx={1.5}
        fill={focused ? '#52B788' : color}
      />
      {/* Checkmark */}
      <Path
        d="M8 12.2L10.8 15L16 9.5"
        stroke={focused ? '#FFFFFF' : color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StatsTabIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Baseline */}
      <Path
        d="M3.5 20.5H20.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Column 1 (Left - starter) */}
      <Rect
        x={5}
        y={13.5}
        width={3.5}
        height={6}
        rx={1.75}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? 0 : 1.8}
        opacity={focused ? 0.55 : 1}
      />
      {/* Column 2 (Middle - growing) */}
      <Rect
        x={10.25}
        y={9.5}
        width={3.5}
        height={10}
        rx={1.75}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? 0 : 1.8}
        opacity={focused ? 0.8 : 1}
      />
      {/* Column 3 (Right - peak) */}
      <Rect
        x={15.5}
        y={4.5}
        width={3.5}
        height={15}
        rx={1.75}
        fill={focused ? '#52B788' : 'none'}
        stroke={focused ? '#52B788' : color}
        strokeWidth={focused ? 0 : 1.8}
      />
      {/* Peak spark dot */}
      {focused && (
        <Circle
          cx={17.25}
          cy={2}
          r={1.5}
          fill="#FFB347"
        />
      )}
    </Svg>
  );
}

type TabType = 'forest' | 'timer' | 'tasks' | 'stats';

function TabIcon({
  name,
  label,
  focused,
}: {
  name: TabType;
  label: string;
  focused: boolean;
}) {
  const iconColor = focused ? COLORS.primary : '#8EA89D';

  const renderIcon = () => {
    switch (name) {
      case 'forest':
        return <ForestTabIcon focused={focused} color={iconColor} />;
      case 'timer':
        return <TimerTabIcon focused={focused} color={iconColor} />;
      case 'tasks':
        return <TasksTabIcon focused={focused} color={iconColor} />;
      case 'stats':
        return <StatsTabIcon focused={focused} color={iconColor} />;
    }
  };

  return (
    <View style={styles.tabItem}>
      <View style={[styles.pillContainer, focused && styles.pillContainerFocused]}>
        {renderIcon()}
      </View>
      <Text
        style={[
          styles.label,
          focused ? styles.labelFocused : styles.labelUnfocused,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {focused ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const barHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: barHeight,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="forest" label="Orman" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="timer" label="Zamanlayıcı" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="tasks" label="Görevler" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="stats" label="İstatistik" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2EFE7',
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 12,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  pillContainer: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pillContainerFocused: {
    backgroundColor: '#E8F5E9',
  },
  label: {
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
  labelFocused: {
    fontFamily: FONTS.headingMedium,
    color: COLORS.primary,
    fontWeight: '700',
  },
  labelUnfocused: {
    fontFamily: FONTS.bodyMedium,
    color: '#8EA89D',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
