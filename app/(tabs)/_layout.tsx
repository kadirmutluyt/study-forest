import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../src/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.label, { color: focused ? COLORS.primary : COLORS.text.muted }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌳" label="Orman" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⏱️" label="Zamanlayıcı" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✅" label="Görevler" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="İstatistik" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabIcon: { alignItems: 'center', gap: 2 },
  emoji: { fontSize: 22, opacity: 0.5 },
  emojiFocused: { opacity: 1 },
  label: { fontFamily: FONTS.body, fontSize: 10 },
});
