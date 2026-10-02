import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/use-auth';
import { useTreeStore, GRID_SIZE } from '../../src/features/tree/tree.store';
import { TreeSVG } from '../../src/components/tree/TreeSVG';
import { LandTerrain } from '../../src/components/tree/LandTerrain';
import { ForestGrid } from '../../src/components/tree/ForestGrid';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';
import {
  TREE_TYPES,
  TREE_STAGES,
  TreeType,
  getLevelForXP,
  getProgressToNextLevel,
} from '../../src/constants/trees';
import { useNotificationStore } from '../../src/features/notification/notification.store';
import { ModernConfirmModal } from '../../src/components/ui/ModernConfirmModal';
import { FeedTreeModal } from '../../src/components/tree/FeedTreeModal';
import { Tree } from '../../src/types';

export default function ForestScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { showToast } = useNotificationStore();
  const {
    activeTree,
    completedTrees,
    allTrees,
    availableXP,
    fetchTrees,
    createTree,
    setActiveTreeById,
    feedTreeWithXP,
  } = useTreeStore();

  const [showPlantModal, setShowPlantModal] = useState(false);
  const [tab, setTab] = useState<'terrain' | 'active'>('terrain');
  const [selectedTileCoord, setSelectedTileCoord] = useState<{ x: number; y: number } | null>(null);
  const [confirmPlantTreeType, setConfirmPlantTreeType] = useState<TreeType | null>(null);

  // Harita odaklama, Ağaç detay & XP Besleme modal durumları
  const [targetMapCoord, setTargetMapCoord] = useState<{ x: number; y: number } | null>(null);
  const [selectedDetailTree, setSelectedDetailTree] = useState<Tree | null>(null);
  const [feedTargetTree, setFeedTargetTree] = useState<Tree | null>(null);

  // Tab'a her odaklanıldığında ağaçları ve XP havuzunu tazele
  useFocusEffect(
    useCallback(() => {
      if (session?.user.id) {
        fetchTrees(session.user.id);
      }
    }, [session?.user.id])
  );

  const handleFeedTree = async (treeId: string, amount: number) => {
    if (!session?.user.id) return;
    const res = await feedTreeWithXP(session.user.id, treeId, amount);
    if (res.success) {
      if (res.treeCompleted) {
        showToast({
          type: 'success',
          icon: '👑',
          title: 'Muhteşem Başarı!',
          message: 'Ağacın 4. seviyeye (Devasa Ağaç) ulaştı ve tamamlandı!',
        });
      } else if (res.leveledUp) {
        showToast({
          type: 'success',
          icon: '🎉',
          title: 'Seviye Atladı!',
          message: `Ağacın Seviye ${res.newLevel}'e yükseldi!`,
        });
      } else {
        showToast({
          type: 'success',
          icon: '💧',
          title: 'Ağaç Beslendi',
          message: `${amount} XP aktarıldı. (Toplam: ${res.newXP} XP)`,
        });
      }
    }
  };

  const handlePlantTree = (treeType: TreeType) => {
    if (!session?.user.id) return;

    if (activeTree && level < 4) {
      // Modern onay alt sayfasını (Bottom Sheet) aç
      setConfirmPlantTreeType(treeType);
      return;
    }

    executePlantTree(treeType);
  };

  const executePlantTree = (treeType: TreeType) => {
    if (!session?.user.id) return;
    const selectedX = selectedTileCoord?.x;
    const selectedY = selectedTileCoord?.y;
    const typeInfo = TREE_TYPES.find((t) => t.id === treeType);

    // 1. ANINDA KULLANICIYA YANIT VER (0ms Optimistic UI)
    setShowPlantModal(false);
    setSelectedTileCoord(null);
    setTab('terrain');

    // 2. Modern bildirim göster
    showToast({
      type: 'success',
      icon: typeInfo?.emoji || '🌱',
      title: 'Tohum Ekildi!',
      message: `${typeInfo?.name || 'Yeni ağacın'} arazine başarıyla yerleştirildi.`,
    });

    // 3. Arka planda veritabanına ekle
    createTree(
      session.user.id,
      treeType,
      selectedX,
      selectedY
    ).then((result) => {
      if (!result.success) {
        showToast({
          type: 'error',
          icon: '⚠️',
          title: 'Ağaç Kaydedilemedi',
          message: result.error || 'Ağaç dikilirken bir sorun oluştu.',
        });
      }
    });
  };

  const handleSetActiveTree = (treeId: string) => {
    if (!session?.user.id) return;
    setActiveTreeById(session.user.id, treeId);
    showToast({
      type: 'success',
      icon: '🌱',
      title: 'Odak Ağacı Değiştirildi',
      message: 'Bu ağaç çalışma seanslarında ve görevlerde büyüyecektir!',
    });
  };

  // Ağacı harita üzerinde bul ve o parsele uç
  const handleGoToTreeMap = (tree: Tree) => {
    if (typeof tree.position_x === 'number' && typeof tree.position_y === 'number') {
      setTargetMapCoord({ x: tree.position_x, y: tree.position_y });
      setSelectedDetailTree(null);
      setTab('terrain');
      showToast({
        type: 'info',
        icon: '🗺️',
        title: 'Haritada Konumlandı',
        message: `Parsel [${tree.position_x}, ${tree.position_y}] merkezine gidildi.`,
      });
    }
  };

  const level = activeTree ? getLevelForXP(activeTree.xp) : 0;
  const progress = activeTree ? getProgressToNextLevel(activeTree.xp) : 0;
  const currentStage = TREE_STAGES[level];
  const nextStage = level < 4 ? TREE_STAGES[level + 1] : null;
  const treeInfo = activeTree
    ? TREE_TYPES.find((t) => t.id === activeTree.tree_type)
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
        {/* Header - Safe top padding for notch / status bar */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + SPACING.xs }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Merhaba! 👋</Text>
            <Text style={styles.subtitle}>
              {allTrees.length}/{GRID_SIZE * GRID_SIZE} parsel ekili {activeTree ? '• 1 aktif ağaç' : ''}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.poolBadge}
              onPress={() => {
                if (activeTree) {
                  setFeedTargetTree(activeTree);
                } else if (allTrees.length > 0) {
                  setFeedTargetTree(allTrees[0]);
                } else {
                  showToast({
                    type: 'info',
                    icon: '💧',
                    title: 'XP Havuzu',
                    message: `Mevcut havuzun: ${availableXP} XP. Beslemek için önce bir ağaç dikmelisin.`,
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.poolBadgeIcon}>💧</Text>
              <Text style={styles.poolBadgeText}>{availableXP} XP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={styles.signOutBtn} activeOpacity={0.7}>
              <Text style={styles.signOutText}>Çıkış</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'terrain' && styles.tabActive]}
            onPress={() => setTab('terrain')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'terrain' && styles.tabTextActive]}>
              🗺️ Orman Haritası
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'active' && styles.tabActive]}
            onPress={() => setTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
              🌱 Aktif Odak {activeTree ? `(S${level})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'terrain' ? (
          /* 🗺️ Google Haritalar Stili İnteraktif Orman Dünyası */
          <View style={styles.mapContainer}>
            <LandTerrain
              trees={allTrees}
              activeTree={activeTree}
              targetFocusCoord={targetMapCoord}
              onTargetFocusHandled={() => setTargetMapCoord(null)}
              onPlantAtTile={(x, y) => {
                setSelectedTileCoord({ x, y });
                setShowPlantModal(true);
              }}
              onSetActiveTree={handleSetActiveTree}
              onFeedTree={(tree) => setFeedTargetTree(tree)}
            />
          </View>
        ) : (
          /* 🌱 Aktif Odak Ağacı Detay Görünümü */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTree ? (
              <>
                {/* Active tree hero card */}
                <Card elevated style={styles.treeCard}>
                  <View style={styles.treeHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.treeName}>
                        {treeInfo?.emoji} {treeInfo?.name}
                      </Text>
                      <Text style={styles.treeStage}>
                        Seviye {level} — {currentStage?.name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.treeXP}>{activeTree.xp} XP</Text>
                      {typeof activeTree.position_x === 'number' && typeof activeTree.position_y === 'number' && (
                        <View style={styles.activeCoordTag}>
                          <Text style={styles.activeCoordTagText}>
                            📍 [{activeTree.position_x}, {activeTree.position_y}]
                          </Text>
                        </View>
                      )}
                    </View>
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
                        <Text style={styles.progressLabel}>{currentStage?.name}</Text>
                        <Text style={styles.progressLabel}>
                          Sonraki: {nextStage.name} ({nextStage.xpRequired} XP)
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.round(progress * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        %{Math.round(progress * 100)} tamamlandı
                      </Text>
                    </View>
                  )}

                  {level === 4 && (
                    <View style={styles.completeTag}>
                      <Text style={styles.completeText}>
                        🎉 Bu ağaç devasa boyuta ulaştı! Koleksiyonundaki diğer ağaçları seçip büyütebilirsin.
                      </Text>
                    </View>
                  )}

                  {/* 3'lü Eylem Butonları */}
                  <View style={styles.activeActionButtons}>
                    <Button
                      title="💧 Besle"
                      onPress={() => setFeedTargetTree(activeTree)}
                      style={{ flex: 1 }}
                      size="md"
                    />
                    <Button
                      title="⏱️ Odaklan"
                      onPress={() => router.push('/(tabs)/timer')}
                      variant="secondary"
                      style={{ flex: 1 }}
                      size="md"
                    />
                    <Button
                      title="🗺️ Haritada Gör"
                      onPress={() => handleGoToTreeMap(activeTree)}
                      variant="secondary"
                      style={{ flex: 1 }}
                      size="md"
                    />
                  </View>
                </Card>

                {/* 3'lü Hızlı Bilgi Satırı */}
                <View style={styles.infoRow}>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>⏱️</Text>
                    <Text style={styles.infoValue}>
                      {activeTree.planted_at
                        ? new Date(activeTree.planted_at).toLocaleDateString('tr-TR')
                        : '-'}
                    </Text>
                    <Text style={styles.infoLabel}>Dikim Tarihi</Text>
                  </Card>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>⭐</Text>
                    <Text style={styles.infoValue}>Seviye {level}/4</Text>
                    <Text style={styles.infoLabel}>Büyüme</Text>
                  </Card>
                  <Card style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>🌿</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{treeInfo?.name ?? '-'}</Text>
                    <Text style={styles.infoLabel}>Tür</Text>
                  </Card>
                </View>

                {/* Ormandaki Diğer Ağaçlar veya İlk Ağaç Kartı */}
                {completedTrees.length > 0 ? (
                  <ForestGrid
                    trees={completedTrees}
                    activeTree={activeTree}
                    title="🌳 Diğer Ağaçların"
                    subtitle={`Arazindeki diğer ${completedTrees.length} ağaç`}
                    onSelectTree={(tree) => setSelectedDetailTree(tree)}
                    onPlantPress={() => {
                      setSelectedTileCoord(null);
                      setShowPlantModal(true);
                    }}
                  />
                ) : (
                  <Card style={styles.singleTreeEncourageCard}>
                    <Text style={styles.encourageEmoji}>🌱</Text>
                    <Text style={styles.encourageTitle}>İlk Ağacını Büyütüyorsun!</Text>
                    <Text style={styles.encourageText}>
                      Bu ağacını seanslarda odaklanarak büyütebilir veya harita üzerinden arazine yeni tohumlar ekebilirsin.
                    </Text>
                  </Card>
                )}
              </>
            ) : allTrees.length > 0 ? (
              /* Aktif ağaç seçili değil ama ormanda ağaçlar var */
              <>
                <Card elevated style={styles.noActiveCard}>
                  <View style={styles.noActiveRow}>
                    <View style={styles.noActiveIconCircle}>
                      <Text style={styles.noActiveEmoji}>🌱</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noActiveTitle}>Aktif Odak Ağacın Yok</Text>
                      <Text style={styles.noActiveText}>
                        Aşağıdaki ağaçlarından birine dokunarak odaklanabilir veya arazine yeni bir tohum ekebilirsin!
                      </Text>
                    </View>
                  </View>
                  <Button
                    title="🌱 Yeni Ağaç Dik"
                    onPress={() => {
                      setSelectedTileCoord(null);
                      setShowPlantModal(true);
                    }}
                    style={{ marginTop: SPACING.md }}
                    size="md"
                  />
                </Card>

                {/* Orman Koleksiyonu */}
                <ForestGrid
                  trees={allTrees}
                  activeTree={null}
                  onSelectTree={(tree) => setSelectedDetailTree(tree)}
                  onPlantPress={() => {
                    setSelectedTileCoord(null);
                    setShowPlantModal(true);
                  }}
                />
              </>
            ) : (
              /* Hiç ağaç yok (İlk Kullanıcı) */
              <Card elevated style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyTitle}>Henüz Hiç Ağacın Yok</Text>
                <Text style={styles.emptyText}>
                  Arazinde büyütmek için ilk tohumunu ek ve çalışma seanslarında odaklanarak seviye atlat!
                </Text>
                <Button
                  title="Arazine Ağaç Dik 🌳"
                  onPress={() => {
                    setSelectedTileCoord(null);
                    setShowPlantModal(true);
                  }}
                  style={styles.plantButton}
                  size="lg"
                />
              </Card>
            )}
          </ScrollView>
        )}

        {/* FAB - Plant new tree button (Sadece Aktif sekmesinde) */}
        {tab === 'active' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setSelectedTileCoord(null);
              setShowPlantModal(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>🌱 Ağaç Dik</Text>
          </TouchableOpacity>
        )}

        {/* Modern Ağaç Seçim Modalı (Bottom Sheet) */}
        <Modal visible={showPlantModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + SPACING.md }]}>
              <View style={styles.dragPill} />

              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    🌱 Ağaç Türü Seç
                  </Text>
                  {selectedTileCoord && (
                    <Text style={styles.modalCoordTag}>
                      Hedef Parsel: [{selectedTileCoord.x}, {selectedTileCoord.y}]
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowPlantModal(false);
                    setSelectedTileCoord(null);
                  }}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Arazinde büyütmek istediğin fidanı seç. Odaklandıkça seviye atlayacak!
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {TREE_TYPES.map((tree) => {
                  const isLocked = completedTrees.length < tree.unlockRequirement;
                  return (
                    <TouchableOpacity
                      key={tree.id}
                      style={[
                        styles.treeOption,
                        isLocked ? styles.treeOptionLocked : styles.treeOptionActive,
                      ]}
                      onPress={() => !isLocked && handlePlantTree(tree.id as TreeType)}
                      disabled={isLocked}
                      activeOpacity={0.75}
                    >
                      <View style={styles.treeIconCircle}>
                        <Text style={styles.treeOptionEmoji}>{tree.emoji}</Text>
                      </View>

                      <View style={styles.treeOptionInfo}>
                        <View style={styles.treeOptionHeader}>
                          <Text style={[styles.treeOptionName, isLocked && styles.textLocked]}>
                            {tree.name}
                          </Text>
                          {isLocked ? (
                            <View style={styles.lockBadge}>
                              <Text style={styles.lockBadgeText}>🔒 {tree.unlockRequirement} Ağaç</Text>
                            </View>
                          ) : (
                            <View style={styles.readyBadge}>
                              <Text style={styles.readyBadgeText}>✓ Ekilebilir</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.treeOptionDesc}>
                          {tree.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modern Ağaç İnceleme Modalı (Bottom Sheet) */}
        <Modal visible={!!selectedDetailTree} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + SPACING.md }]}>
              <View style={styles.dragPill} />

              {selectedDetailTree && (() => {
                const info = TREE_TYPES.find((t) => t.id === selectedDetailTree.tree_type);
                const tLevel = getLevelForXP(selectedDetailTree.xp);
                const tStage = TREE_STAGES[tLevel];
                const tProgress = getProgressToNextLevel(selectedDetailTree.xp);
                const isCurrentActive = activeTree && activeTree.id === selectedDetailTree.id;

                return (
                  <View>
                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalTitle}>🌳 Ağaç Detayı</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedDetailTree(null)}
                        style={styles.modalCloseBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalCloseText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Ağaç Görseli ve Aşama Bilgisi */}
                    <View style={styles.detailHeroCard}>
                      <TreeSVG
                        treeType={selectedDetailTree.tree_type as TreeType}
                        level={tLevel}
                        progress={tProgress}
                        size={92}
                      />
                      <View style={styles.detailHeroMeta}>
                        <Text style={styles.detailTreeName}>
                          {info?.emoji} {info?.name}
                        </Text>
                        <Text style={styles.detailTreeStage}>
                          Seviye {tLevel} — {tStage?.name}
                        </Text>
                        {isCurrentActive ? (
                          <View style={styles.detailActiveBadge}>
                            <Text style={styles.detailActiveBadgeText}>🌱 Şu Anki Aktif Odak</Text>
                          </View>
                        ) : (
                          <View style={styles.detailArchivedBadge}>
                            <Text style={styles.detailArchivedBadgeText}>🌳 Orman Koleksiyonunda</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* İstatistik Kutuları */}
                    <View style={styles.detailStatsRow}>
                      <View style={styles.detailStatBox}>
                        <Text style={styles.detailStatEmoji}>⚡</Text>
                        <Text style={styles.detailStatValue}>{selectedDetailTree.xp} XP</Text>
                        <Text style={styles.detailStatLabel}>Kazanılan</Text>
                      </View>
                      <View style={styles.detailStatBox}>
                        <Text style={styles.detailStatEmoji}>📍</Text>
                        <Text style={styles.detailStatValue}>
                          {typeof selectedDetailTree.position_x === 'number'
                            ? `[${selectedDetailTree.position_x},${selectedDetailTree.position_y}]`
                            : '-'}
                        </Text>
                        <Text style={styles.detailStatLabel}>Parsel</Text>
                      </View>
                      <View style={styles.detailStatBox}>
                        <Text style={styles.detailStatEmoji}>⏱️</Text>
                        <Text style={styles.detailStatValue}>
                          {selectedDetailTree.planted_at
                            ? new Date(selectedDetailTree.planted_at).toLocaleDateString('tr-TR')
                            : '-'}
                        </Text>
                        <Text style={styles.detailStatLabel}>Dikim</Text>
                      </View>
                    </View>

                    {/* Eylem Butonları */}
                    <View style={styles.detailActions}>
                      <Button
                        title="💧 Bu Ağacı Besle (+XP)"
                        onPress={() => {
                          const target = selectedDetailTree;
                          setSelectedDetailTree(null);
                          setFeedTargetTree(target);
                        }}
                        size="lg"
                        style={{ marginBottom: SPACING.sm }}
                      />

                      {!isCurrentActive && (
                        <Button
                          title="🌱 Bu Ağacı Aktif Odak Yap"
                          onPress={() => {
                            handleSetActiveTree(selectedDetailTree.id);
                            setSelectedDetailTree(null);
                          }}
                          variant="secondary"
                          size="lg"
                          style={{ marginBottom: SPACING.sm }}
                        />
                      )}

                      {isCurrentActive && (
                        <Button
                          title="⏱️ Zamanlayıcıda Büyüt"
                          onPress={() => {
                            setSelectedDetailTree(null);
                            router.push('/(tabs)/timer');
                          }}
                          variant="secondary"
                          size="lg"
                          style={{ marginBottom: SPACING.sm }}
                        />
                      )}

                      <TouchableOpacity
                        style={styles.detailMapBtn}
                        onPress={() => handleGoToTreeMap(selectedDetailTree)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.detailMapBtnText}>🗺️ Haritada Konumuna Git</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* Modern Mevcut Ağaç Koruma & Yeni Dikim Onay Modalı */}
        <ModernConfirmModal
          visible={!!confirmPlantTreeType}
          icon="🌱"
          badge="Mevcut Ağacın Korunuyor"
          title="Yeni Bir Tohum Ekilsin mi?"
          message={`Büyütmekte olduğun ${treeInfo?.name || 'ağaç'} arazindeki yerinde kalacak ve orman koleksiyonuna güvenle eklenecektir.`}
          confirmText="🌱 Arazime Kaydet & Yeni Ağaç Dik"
          cancelText="Mevcut Ağacımı Büyütmeye Devam Et"
          onConfirm={() => {
            if (confirmPlantTreeType) {
              const chosen = confirmPlantTreeType;
              setConfirmPlantTreeType(null);
              executePlantTree(chosen);
            }
          }}
          onCancel={() => setConfirmPlantTreeType(null)}
        >
          {activeTree && (
            <View style={styles.confirmTreeCard}>
              <TreeSVG
                treeType={activeTree.tree_type as TreeType}
                level={level}
                progress={progress}
                size={54}
              />
              <View style={styles.confirmTreeInfo}>
                <Text style={styles.confirmTreeName}>
                  {treeInfo?.emoji} {treeInfo?.name}
                </Text>
                <Text style={styles.confirmTreeStage}>
                  Seviye {level} • {currentStage?.name}
                </Text>
                <Text style={styles.confirmTreeXP}>{activeTree.xp} XP Kazanıldı</Text>
              </View>
            </View>
          )}
        </ModernConfirmModal>

        {/* Ağacı XP ile Besleme Modalı */}
        <FeedTreeModal
          visible={!!feedTargetTree}
          tree={feedTargetTree}
          availableXP={availableXP}
          onClose={() => setFeedTargetTree(null)}
          onFeed={(amount) =>
            feedTargetTree
              ? handleFeedTree(feedTargetTree.id, amount)
              : Promise.resolve()
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  greeting: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text.primary },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  poolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  poolBadgeIcon: {
    fontSize: 13,
  },
  poolBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  signOutBtn: { padding: SPACING.xs },
  signOutText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.danger },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface },
  tabText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.muted },
  tabTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + 30 },
  treeCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  treeName: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.text.primary },
  treeStage: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  treeXP: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.accent },
  activeCoordTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  activeCoordTagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.primary,
  },
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
  completeText: { fontFamily: FONTS.bodyBold, color: COLORS.accentDark, textAlign: 'center' },
  activeActionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  mapActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapActionBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: 4,
  },
  infoEmoji: { fontSize: 20, marginBottom: 2 },
  infoValue: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.text.primary },
  infoLabel: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  singleTreeEncourageCard: {
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
  },
  encourageEmoji: { fontSize: 32, marginBottom: 6 },
  encourageTitle: { fontFamily: FONTS.heading, fontSize: 16, color: COLORS.text.primary, marginBottom: 4 },
  encourageText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  noActiveCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
  },
  noActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  noActiveIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActiveEmoji: {
    fontSize: 24,
  },
  noActiveTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  noActiveText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 17,
  },
  emptyCard: { alignItems: 'center', padding: SPACING.xl, marginHorizontal: SPACING.lg, marginTop: SPACING.xl },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text.primary },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  plantButton: { marginTop: SPACING.lg, alignSelf: 'stretch' },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg + 10,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    elevation: 6,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: { fontFamily: FONTS.bodyBold, color: '#fff', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 4,
    borderTopRightRadius: RADIUS.xl + 4,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm + 4,
    maxHeight: '85%',
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  modalCoordTag: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#6B7280',
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  treeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.sm + 2,
    backgroundColor: '#FFFFFF',
  },
  treeOptionActive: {
    borderColor: '#E8F5E9',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  treeOptionLocked: {
    borderColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    opacity: 0.65,
  },
  treeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeOptionEmoji: { fontSize: 28 },
  treeOptionInfo: { flex: 1 },
  treeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  treeOptionName: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text.primary },
  treeOptionDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.text.secondary },
  textLocked: { color: COLORS.text.muted },
  lockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  lockBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#DC2626',
  },
  readyBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  readyBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#15803D',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  confirmTreeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
  },
  confirmTreeInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  confirmTreeName: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  confirmTreeStage: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  confirmTreeXP: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  // Ağaç Detayı Modalı Stilleri
  detailHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
  },
  detailHeroMeta: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  detailTreeName: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.text.primary,
  },
  detailTreeStage: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
    marginBottom: 6,
  },
  detailActiveBadge: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  detailActiveBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#15803D',
  },
  detailArchivedBadge: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  detailArchivedBadgeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#6B7280',
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  detailStatBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  detailStatEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  detailStatValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text.primary,
  },
  detailStatLabel: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  detailActions: {
    gap: SPACING.xs + 2,
    marginTop: SPACING.xs,
  },
  detailMapBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailMapBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
});
