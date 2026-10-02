import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Tree } from '../../types';
import { TREE_TYPES, TreeType } from '../../constants/trees';
import { TreeSVG } from './TreeSVG';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - SPACING.md * 3) / 2 - SPACING.sm;

interface ForestGridProps {
  trees: Tree[];
}

export function ForestGrid({ trees }: ForestGridProps) {
  if (trees.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyText}>Ormanın henüz boş</Text>
        <Text style={styles.emptySubtext}>İlk ağacını büyütmeye başla!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={trees}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <View style={styles.treeCard}>
          <TreeSVG
            treeType={item.tree_type as TreeType}
            level={item.level}
            progress={1}
            size={80}
          />
          <Text style={styles.treeName}>
            {TREE_TYPES.find((t) => t.id === item.tree_type)?.name || 'Ağaç'}
          </Text>
          <Text style={styles.treeDate}>
            {new Date(item.completed_at || item.planted_at).toLocaleDateString('tr-TR')}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  grid: { padding: SPACING.sm },
  row: { justifyContent: 'space-between', marginBottom: SPACING.sm },
  treeCard: {
    width: ITEM_SIZE,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  treeName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
  },
  treeDate: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.text.primary,
  },
  emptySubtext: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});
