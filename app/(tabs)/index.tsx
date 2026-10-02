import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/features/auth/use-auth';
import { useTreeStore } from '../../src/features/tree/tree.store';
import { TreeSVG } from '../../src/components/tree/TreeSVG';
import { ForestGrid } from '../../src/components/tree/ForestGrid';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';
import {
  TREE_TYPES, TREE_STAGES, TreeType,
  getLevelForXP, getProgressToNextLevel,
} from '../../src/constants/trees';

export default function ForestScreen() {
  const { session, signOut } = useAuth();
  const { activeTree, completedTrees, fetchTrees, createTree } = useTreeStore();
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [planting, setPlanting] = useState(false);
  const [tab, setTab] = useState<'active' | 'forest'>('active');

  useEffect(() => {
    if (session?.user.id) {
      fetchTrees(session.user.id);
    }
  }, [session?.user.id]);

  const handlePlantTree = async (treeType: TreeType) => {
    if (!session?.user.id) return;
    setPlanting(true);
    const tree = await createTree(session.user.id, treeType);
    setPlanting(false);
    setShowPlantModal(false);
    if (!tree) Alert.alert('Hata', 'Ağaç dikilirken bir sorun oluştu.');
  };

  const level = activeTree ? getLevelForXP(activeTree.xp) : 0;
  const progress = activeTree ? getProgressToNextLevel(activeTree.xp) : 0;
  const currentStage = TREE_STAGES[level];
  const nextStage = level < 4 ? TREE_STAGES[level + 1] : null;
  const treeInfo = activeTree
    ? TREE_TYPES.find((t) => t.id === activeTree.tree_type)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Merhaba! 👋</Text>
            <Text style={styles.subtitle}>
              {completedTrees.length} ağaç tamamlandı
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'active' && styles.tabActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
              🌱 Aktif Ağaç
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'forest' && styles.tabActive]}
            onPress={() => setTab('forest')}
          >
            <Text style={[styles.tabText, tab === 'forest' && styles.tabTextActive]}>
              🌳 Ormanım ({completedTrees.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'active' ? (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {activeTree ? (
              <>
                {/* Active tree card */}
                <Card elevated style={styles.treeCard}>
                  <View style={styles.treeHeader}>
                    <View>
                      <Text style={styles.treeName}>
                        {treeInfo?.emoji} {treeInfo?.name}
                      </Text>
                      <Text style={styles.treeStage}>
                        Seviye {level} — {currentStage.name}
                      </Text>
                    </View>
                    <Text style={styles.treeXP}>{activeTree.xp} XP</Text>
                  </View>

                  {/* Tree visual */}
                  <View style={styles.treeVisual}>
                    <TreeSVG
                      treeType={activeTree.tree_type as TreeType}
                      level={level}
                      progress={progress}
                      size={160}
                    />
                  </View>

                  {/* Progress bar */}
                  {nextStage && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressLabel}>{currentStage.name}</Text>
                        <Text style={styles.progressLabel}>{nextStage.name}</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {nextStage.xpRequired - activeTree.xp} XP kaldı
                      </Text>
                    </View>
                  )}

                  {level === 4 && (
                    <View style={styles.completeTag}>
                      <Text style={styles.completeText}>🎉 Ağaç Tamamlandı!</Text>
                    </View>
                  )}
                </Card>

                {/* Info cards row */}
                <View style={styles.infoRow}>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>🍅</Text>
                    <Text style={styles.infoValue}>+150 XP</Text>
                    <Text style={styles.infoLabel}>Pomodoro</Text>
                  </Card>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>⏱️</Text>
                    <Text style={styles.infoValue}>+5 XP/dk</Text>
                    <Text style={styles.infoLabel}>Serbest</Text>
                  </Card>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>✅</Text>
                    <Text style={styles.infoValue}>+100 XP</Text>
                    <Text style={styles.infoLabel}>Görev</Text>
                  </Card>
                </View>
              </>
            ) : (
              <Card elevated style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyTitle}>Henüz ağacın yok</Text>
                <Text style={styles.emptyText}>
                  İlk ağacını dik ve çalışmaya başla!
                </Text>
                <Button
                  title="🌱 İlk Ağacımı Dik"
                  onPress={() => setShowPlantModal(true)}
                  style={styles.plantButton}
                  size="lg"
                />
              </Card>
            )}
          </ScrollView>
        ) : (
          <ForestGrid trees={completedTrees} />
        )}

        {/* FAB - Plant new tree (only if no active tree) */}
        {!activeTree && tab === 'active' ? null : activeTree && tab === 'active' ? null : (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowPlantModal(true)}
          >
            <Text style={styles.fabText}>🌱 Yeni Ağaç</Text>
          </TouchableOpacity>
        )}

        {/* Plant Tree Modal */}
        <Modal visible={showPlantModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🌱 Ağaç Seç</Text>
              <Text style={styles.modalSubtitle}>
                Hangi ağacı büyütmek istersin?
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {TREE_TYPES.map((tree) => {
                  const isLocked = completedTrees.length < tree.unlockRequirement;
                  return (
                    <TouchableOpacity
                      key={tree.id}
                      style={[styles.treeOption, isLocked && styles.treeOptionLocked]}
                      onPress={() => !isLocked && handlePlantTree(tree.id as TreeType)}
                      disabled={isLocked}
                    >
                      <Text style={styles.treeOptionEmoji}>{tree.emoji}</Text>
                      <View style={styles.treeOptionInfo}>
                        <Text style={[styles.treeOptionName, isLocked && styles.textLocked]}>
                          {tree.name}
                        </Text>
                        <Text style={styles.treeOptionDesc}>
                          {isLocked
                            ? `🔒 ${tree.unlockRequirement} ağaç tamamla`
                            : tree.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Button
                title="İptal"
                onPress={() => setShowPlantModal(false)}
                variant="ghost"
                style={{ marginTop: SPACING.md }}
              />
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  greeting: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text.primary },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  signOutBtn: { padding: SPACING.xs },
  signOutText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.danger },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface },
  tabText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.muted },
  tabTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
  scroll: { flex: 1, paddingHorizontal: SPACING.lg },
  treeCard: { marginBottom: SPACING.md },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  treeName: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.text.primary },
  treeStage: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  treeXP: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.accent },
  treeVisual: { alignItems: 'center', paddingVertical: SPACING.md },
  progressSection: { marginTop: SPACING.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.text.muted },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  completeTag: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  completeText: { fontFamily: FONTS.bodyBold, color: COLORS.accentDark },
  infoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  infoCard: { flex: 1, alignItems: 'center', padding: SPACING.sm },
  infoEmoji: { fontSize: 20, marginBottom: 2 },
  infoValue: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.text.primary },
  infoLabel: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  emptyCard: { alignItems: 'center', padding: SPACING.xl, marginTop: SPACING.xl },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text.primary },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  plantButton: { marginTop: SPACING.lg, alignSelf: 'stretch' },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  fabText: { fontFamily: FONTS.bodyBold, color: '#fff', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '75%',
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text.primary, marginBottom: 4 },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  treeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  treeOptionLocked: { opacity: 0.5 },
  treeOptionEmoji: { fontSize: 32 },
  treeOptionInfo: { flex: 1 },
  treeOptionName: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text.primary },
  treeOptionDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  textLocked: { color: COLORS.text.muted },
});
