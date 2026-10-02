import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tree } from '../../types';
import { TreeSVG } from './TreeSVG';
import {
  TREE_TYPES,
  TREE_STAGES,
  TreeType,
  getLevelForXP,
  getProgressToNextLevel,
} from '../../constants/trees';
import { Button } from '../ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

interface FeedTreeModalProps {
  visible: boolean;
  tree: Tree | null;
  availableXP: number;
  onClose: () => void;
  onFeed: (amount: number) => Promise<void>;
}

export function FeedTreeModal({
  visible,
  tree,
  availableXP,
  onClose,
  onFeed,
}: FeedTreeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [feeding, setFeeding] = useState<boolean>(false);

  // Seviye ve ilerleme hesapları
  const currentTreeXP = tree?.xp ?? 0;
  const currentLevel = getLevelForXP(currentTreeXP);
  const currentStage = TREE_STAGES[currentLevel];
  const nextStage = currentLevel < 4 ? TREE_STAGES[currentLevel + 1] : null;
  const currentProgress = getProgressToNextLevel(currentTreeXP);
  const treeInfo = tree ? TREE_TYPES.find((t) => t.id === tree.tree_type) : null;

  // Sonraki seviyeye kalan XP
  const neededXP = nextStage ? Math.max(0, nextStage.xpRequired - currentTreeXP) : 0;

  // Modal açıldığında varsayılan mantıklı miktarı seç
  useEffect(() => {
    if (visible) {
      if (availableXP <= 0) {
        setSelectedAmount(0);
      } else if (neededXP > 0 && availableXP >= neededXP) {
        setSelectedAmount(neededXP);
      } else if (availableXP >= 100) {
        setSelectedAmount(100);
      } else if (availableXP >= 50) {
        setSelectedAmount(50);
      } else {
        setSelectedAmount(availableXP);
      }
    }
  }, [visible, availableXP, neededXP]);

  // Yeni tahmini XP ve seviye
  const projectedXP = currentTreeXP + selectedAmount;
  const projectedLevel = getLevelForXP(projectedXP);
  const willLevelUp = projectedLevel > currentLevel;
  const projectedProgress = getProgressToNextLevel(projectedXP);

  const handleConfirmFeed = async () => {
    if (selectedAmount <= 0 || selectedAmount > availableXP || feeding) return;
    setFeeding(true);
    try {
      await onFeed(selectedAmount);
      onClose();
    } finally {
      setFeeding(false);
    }
  };

  if (!tree) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + SPACING.md }]}>
          {/* Sürükleme Tutamacı */}
          <View style={styles.dragPill} />

          {/* Başlık ve Kapat Butonu */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>💧 Ağacı Besle & Büyüt</Text>
              <Text style={styles.subtitle}>
                {"Kazandığın XP'yi bu ağaca aktararak seviye atlat"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Ağaç Durum Kartı */}
            <View style={styles.treePreviewCard}>
              <TreeSVG
                treeType={tree.tree_type as TreeType}
                level={projectedLevel}
                progress={projectedProgress}
                size={82}
              />
              <View style={styles.treeMeta}>
                <View style={styles.treeTitleRow}>
                  <Text style={styles.treeName}>
                    {treeInfo?.emoji} {treeInfo?.name}
                  </Text>
                  {willLevelUp && (
                    <View style={styles.levelUpBadge}>
                      <Text style={styles.levelUpText}>⭐ Seviye {projectedLevel} Olacak!</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.stageText}>
                  Seviye {currentLevel} • {currentStage?.name}
                </Text>

                {/* İlerleme Çubuğu (Mevcut + Eklenecek Önizleme) */}
                {nextStage ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelText}>
                        {currentTreeXP} XP {selectedAmount > 0 ? `(+${selectedAmount})` : ''}
                      </Text>
                      <Text style={styles.progressLabelText}>
                        Hedef: {nextStage.xpRequired} XP
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFillBase,
                          { width: `${Math.round(currentProgress * 100)}%` },
                        ]}
                      />
                      {selectedAmount > 0 && (
                        <View
                          style={[
                            styles.progressFillBonus,
                            {
                              left: `${Math.round(currentProgress * 100)}%`,
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100 - Math.round(currentProgress * 100),
                                  Math.round((projectedProgress - currentProgress) * 100)
                                )
                              )}%`,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.maxBadge}>
                    <Text style={styles.maxBadgeText}>🏆 Devasa Boyuta Ulaşıldı (Max)</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Kullanılabilir XP Havuzu Rozeti */}
            <View style={styles.poolCard}>
              <View style={styles.poolLeft}>
                <Text style={styles.poolEmoji}>💧</Text>
                <View>
                  <Text style={styles.poolTitle}>Kullanılabilir XP Havuzun</Text>
                  <Text style={styles.poolSubtitle}>
                    Çalışma ve görevlerden biriken enerjin
                  </Text>
                </View>
              </View>
              <Text style={styles.poolValue}>{availableXP} XP</Text>
            </View>

            {availableXP <= 0 ? (
              <View style={styles.noXpCard}>
                <Text style={styles.noXpText}>
                  ⚠️ Henüz havuzunda kullanılabilir XP yok. Zamanlayıcıda odaklanarak veya görevleri tamamlayarak XP biriktirebilirsin!
                </Text>
              </View>
            ) : (
              <>
                {/* Hızlı Miktar Seçici Çipler */}
                <Text style={styles.sectionHeading}>Aktarılacak Miktar Seç</Text>
                <View style={styles.chipRow}>
                  {availableXP >= 50 && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        selectedAmount === 50 && styles.chipActive,
                      ]}
                      onPress={() => setSelectedAmount(50)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selectedAmount === 50 && styles.chipTextActive]}>
                        +50 XP
                      </Text>
                    </TouchableOpacity>
                  )}

                  {availableXP >= 100 && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        selectedAmount === 100 && styles.chipActive,
                      ]}
                      onPress={() => setSelectedAmount(100)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selectedAmount === 100 && styles.chipTextActive]}>
                        +100 XP
                      </Text>
                    </TouchableOpacity>
                  )}

                  {availableXP >= 250 && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        selectedAmount === 250 && styles.chipActive,
                      ]}
                      onPress={() => setSelectedAmount(250)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selectedAmount === 250 && styles.chipTextActive]}>
                        +250 XP
                      </Text>
                    </TouchableOpacity>
                  )}

                  {neededXP > 0 && availableXP >= neededXP && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        styles.chipLevelUp,
                        selectedAmount === neededXP && styles.chipActive,
                      ]}
                      onPress={() => setSelectedAmount(neededXP)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          styles.chipLevelUpText,
                          selectedAmount === neededXP && styles.chipTextActive,
                        ]}
                      >
                        ⭐ Seviye Atlat (+{neededXP})
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.chip,
                      selectedAmount === availableXP && styles.chipActive,
                    ]}
                    onPress={() => setSelectedAmount(availableXP)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedAmount === availableXP && styles.chipTextActive,
                      ]}
                    >
                      💧 Tümünü Ver (+{availableXP})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Miktar Arttır / Azalt Stepper */}
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, selectedAmount <= 25 && styles.stepBtnDisabled]}
                    onPress={() => setSelectedAmount((prev) => Math.max(25, prev - 50))}
                    disabled={selectedAmount <= 25}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>- 50</Text>
                  </TouchableOpacity>

                  <View style={styles.amountDisplay}>
                    <Text style={styles.amountNumber}>{selectedAmount}</Text>
                    <Text style={styles.amountUnit}>XP verilecek</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      selectedAmount >= availableXP && styles.stepBtnDisabled,
                    ]}
                    onPress={() =>
                      setSelectedAmount((prev) => Math.min(availableXP, prev + 50))
                    }
                    disabled={selectedAmount >= availableXP}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>+ 50</Text>
                  </TouchableOpacity>
                </View>

                {/* Onay Butonu */}
                <Button
                  title={
                    willLevelUp
                      ? `⭐ ${selectedAmount} XP Ver & Seviye Atlat!`
                      : `💧 ${selectedAmount} XP Ver ve Ağacı Büyüt`
                  }
                  onPress={handleConfirmFeed}
                  disabled={selectedAmount <= 0 || selectedAmount > availableXP || feeding}
                  loading={feeding}
                  size="lg"
                  style={{ marginTop: SPACING.md }}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 4,
    borderTopRightRadius: RADIUS.xl + 4,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm + 4,
    maxHeight: '90%',
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#6B7280',
  },
  treePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
    marginBottom: SPACING.sm + 2,
  },
  treeMeta: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  treeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treeName: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  levelUpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  levelUpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#D97706',
  },
  stageText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: SPACING.xs + 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  progressLabelText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.text.muted,
  },
  progressBar: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFillBase: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressFillBonus: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#10B981',
    opacity: 0.8,
  },
  maxBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  maxBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#15803D',
  },
  poolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: SPACING.md,
  },
  poolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  poolEmoji: {
    fontSize: 24,
  },
  poolTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#1D4ED8',
  },
  poolSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#3B82F6',
  },
  poolValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: '#1E40AF',
  },
  noXpCard: {
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: SPACING.md,
  },
  noXpText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionHeading: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipLevelUp: {
    backgroundColor: '#FEF3C7',
  },
  chipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.text.primary,
  },
  chipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#1D4ED8',
  },
  chipLevelUpText: {
    color: '#D97706',
    fontFamily: FONTS.bodyBold,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.sm,
  },
  stepBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
  },
  amountDisplay: {
    alignItems: 'center',
  },
  amountNumber: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.primary,
  },
  amountUnit: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
  },
});
