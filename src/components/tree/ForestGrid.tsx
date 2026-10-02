import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Tree } from '../../types';
import { TREE_TYPES, TREE_STAGES, TreeType } from '../../constants/trees';
import { TreeSVG } from './TreeSVG';
import { Card } from '../ui/Card';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
// Ekran genişliği - 2 * 16px kenar boşluğu - 12px kartlar arası boşluk
const CARD_WIDTH = Math.floor((width - SPACING.lg * 2 - 12) / 2);

interface ForestGridProps {
  trees: Tree[];
  activeTree?: Tree | null;
  onSelectTree: (tree: Tree) => void;
  onPlantPress?: () => void;
  title?: string;
  subtitle?: string;
}

export function ForestGrid({
  trees,
  activeTree,
  onSelectTree,
  title = '🌳 Orman Koleksiyonu',
  subtitle,
}: ForestGridProps) {
  const [filter, setFilter] = useState<'all' | 'growing' | 'completed'>('all');

  const filteredTrees = trees.filter((t) => {
    if (filter === 'growing') return t.level < 4;
    if (filter === 'completed') return t.level >= 4;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Başlık ve İstatistik */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle || `Arazindeki diğer ağaçlar (${trees.length})`}
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{trees.length} Ağaç</Text>
        </View>
      </View>

      {/* Filtreleme Çipleri (3 veya daha fazla ağaç varsa) */}
      {trees.length > 2 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tümü ({trees.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'growing' && styles.filterChipActive]}
            onPress={() => setFilter('growing')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'growing' && styles.filterTextActive]}>
              🌱 Büyüyenler
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              🏆 Devasa (S4)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ağaç Kartları Izgarası */}
      {filteredTrees.length > 0 ? (
        <View style={styles.gridContainer}>
          {filteredTrees.map((item) => {
            const itemInfo = TREE_TYPES.find((t) => t.id === item.tree_type);
            const isCurrentActive = activeTree && activeTree.id === item.id;
            const isMaxLevel = item.level >= 4;
            const stage = TREE_STAGES[item.level] || TREE_STAGES[0];

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.treeCard,
                  isCurrentActive && styles.treeCardActive,
                ]}
                onPress={() => onSelectTree(item)}
                activeOpacity={0.75}
              >
                {/* Aktif Odak Rozeti */}
                {isCurrentActive && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>🌱 Aktif</Text>
                  </View>
                )}

                {/* Ağaç Görseli */}
                <View style={styles.treeSvgContainer}>
                  <TreeSVG
                    treeType={item.tree_type as TreeType}
                    level={item.level}
                    progress={1}
                    size={72}
                  />
                </View>

                {/* Başlık */}
                <Text style={styles.treeName} numberOfLines={1}>
                  {itemInfo?.emoji} {itemInfo?.name || 'Ağaç'}
                </Text>

                {/* Seviye Etiketi */}
                <View style={[styles.levelTag, isMaxLevel && styles.maxLevelTag]}>
                  <Text style={[styles.levelTagText, isMaxLevel && styles.maxLevelTagText]}>
                    {isMaxLevel ? '🏆 Devasa (S4)' : `S${item.level} • ${stage.name}`}
                  </Text>
                </View>

                {/* Alt Bilgi: XP ve Harita Koordinatı */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.treeXP}>{item.xp} XP</Text>
                  {typeof item.position_x === 'number' && typeof item.position_y === 'number' && (
                    <View style={styles.coordTag}>
                      <Text style={styles.coordText}>
                        📍 [{item.position_x}, {item.position_y}]
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🍃</Text>
          <Text style={styles.emptyTitle}>Ağaç Bulunamadı</Text>
          <Text style={styles.emptyText}>
            Filtreyi değiştirerek diğer ağaçlarını inceleyebilirsin.
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  totalBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  totalBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.primary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },
  filterText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  filterTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  treeCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
    ...SHADOWS.sm,
    shadowColor: '#1B4332',
    shadowOpacity: 0.05,
    elevation: 2,
    position: 'relative',
  },
  treeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAFCFA',
    shadowOpacity: 0.12,
    elevation: 3,
  },
  activePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    zIndex: 2,
  },
  activePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#15803D',
  },
  treeSvgContainer: {
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    marginTop: 2,
  },
  treeName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  levelTag: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  maxLevelTag: {
    backgroundColor: COLORS.accent + '25',
  },
  levelTagText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: COLORS.primary,
  },
  maxLevelTagText: {
    color: COLORS.accentDark,
    fontFamily: FONTS.bodyBold,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.xs + 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  treeXP: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  coordTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  coordText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: '#6B7280',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    width: '100%',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
