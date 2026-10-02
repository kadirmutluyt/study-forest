import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Tree } from '../../types';
import {
  TREE_TYPES,
  TREE_STAGES,
  TreeType,
  getLevelForXP,
  getProgressToNextLevel,
} from '../../constants/trees';
import { TreeSVG } from './TreeSVG';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { MAP_GRID_SIZE } from '../../features/tree/tree.store';

// ==========================================
// Harita & Kanvas Sabitleri (Ultra-Optimize)
// ==========================================
const GRID_SIZE = MAP_GRID_SIZE; // 30x30 = 900 parsel
const CELL_SIZE = 64; // Optimize edilmiş parsel boyutu (64px)
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 1920 x 1920 px hafif ve akıcı kanvas
const MIN_SCALE = 0.32;
const MAX_SCALE = 2.2;
const DEFAULT_SCALE = 0.85;

interface InteractiveForestMapProps {
  trees: Tree[];
  activeTree: Tree | null;
  onPlantAtTile: (x: number, y: number) => void;
  onSetActiveTree: (treeId: string) => void;
  onFeedTree?: (tree: Tree) => void;
  targetFocusCoord?: { x: number; y: number } | null;
  onTargetFocusHandled?: () => void;
}

export function InteractiveForestMap({
  trees,
  activeTree,
  onPlantAtTile,
  onSetActiveTree,
  onFeedTree,
  targetFocusCoord,
  onTargetFocusHandled,
}: InteractiveForestMapProps) {
  // Viewport ölçüsü & ekran koordinatı (Ref ile, re-render tetiklemez)
  const viewportRef = useRef<View>(null);
  const viewportScreenPos = useRef({ pageX: 0, pageY: 100, width: 360, height: 500 });
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number } | null>(null);
  const [zoomPercent, setZoomPercent] = useState(Math.round(DEFAULT_SCALE * 100));

  // Animasyon Değerleri (Pan & Zoom)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(DEFAULT_SCALE)).current;

  // Gesture anlık değer takibi (Sıfır React state gecikmesi)
  const currentPan = useRef({ x: 0, y: 0 });
  const currentScale = useRef(DEFAULT_SCALE);

  useEffect(() => {
    const panSub = pan.addListener((val) => {
      currentPan.current = val;
    });
    const scaleSub = scale.addListener((val) => {
      currentScale.current = val.value;
      // DİKKAT: Animasyon esnasında React re-render TETİKLEME (Kasmanın ana sebebiydi!)
    });
    return () => {
      pan.removeListener(panSub);
      scale.removeListener(scaleSub);
    };
  }, [pan, scale]);

  // Ağaç koordinat eşlemesi ("x,y" => Tree)
  const treeMap = new Map<string, Tree>();
  trees.forEach((t) => {
    if (typeof t.position_x === 'number' && typeof t.position_y === 'number') {
      treeMap.set(`${t.position_x},${t.position_y}`, t);
    }
  });

  // Seçili parseldeki ağaç (varsa)
  const selectedKey = selectedCoord ? `${selectedCoord.x},${selectedCoord.y}` : null;
  const selectedTree = selectedKey ? treeMap.get(selectedKey) : null;
  const selectedLevel = selectedTree ? getLevelForXP(selectedTree.xp) : 0;
  const selectedStage = TREE_STAGES[selectedLevel];
  const selectedProgress = selectedTree ? getProgressToNextLevel(selectedTree.xp) : 0;
  const selectedTreeInfo = selectedTree
    ? TREE_TYPES.find((t) => t.id === selectedTree.tree_type)
    : null;
  const isSelectedActive = selectedTree && activeTree && selectedTree.id === activeTree.id;

  // Kamera sınır sınırlaması
  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      const maxOffset = (CANVAS_SIZE * currentZoom) / 2 + 100;
      return {
        x: Math.max(-maxOffset, Math.min(maxOffset, x)),
        y: Math.max(-maxOffset, Math.min(maxOffset, y)),
      };
    },
    []
  );

  // Belirli bir kanvas koordinatına kamerayı odaklama fonksiyonu
  const focusOnCanvasPoint = useCallback(
    (canvasX: number, canvasY: number, targetScale: number = 1.2, animated: boolean = true) => {
      const offsetX = -(canvasX - CANVAS_SIZE / 2) * targetScale;
      const offsetY = -(canvasY - CANVAS_SIZE / 2) * targetScale;
      const clamped = clampPan(offsetX, offsetY, targetScale);

      setZoomPercent(Math.round(targetScale * 100));

      if (animated) {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: targetScale,
            useNativeDriver: true,
            friction: 8,
          }),
          Animated.spring(pan, {
            toValue: clamped,
            useNativeDriver: true,
            friction: 8,
          }),
        ]).start();
      } else {
        scale.setValue(targetScale);
        pan.setValue(clamped);
      }
    },
    [scale, pan, clampPan]
  );

  // Aktif ağaca odaklan
  const focusOnActiveTree = useCallback(() => {
    if (
      activeTree &&
      typeof activeTree.position_x === 'number' &&
      typeof activeTree.position_y === 'number'
    ) {
      const treeCenterX = activeTree.position_x * CELL_SIZE + CELL_SIZE / 2;
      const treeCenterY = activeTree.position_y * CELL_SIZE + CELL_SIZE / 2;
      setSelectedCoord({ x: activeTree.position_x, y: activeTree.position_y });
      focusOnCanvasPoint(treeCenterX, treeCenterY, 1.3, true);
    } else {
      focusOnCanvasPoint(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0.85, true);
    }
  }, [activeTree, focusOnCanvasPoint]);

  // Kuşbakışı tüm adayı göster
  const zoomToOverview = useCallback(() => {
    setZoomPercent(Math.round(MIN_SCALE * 100));
    Animated.parallel([
      Animated.spring(scale, {
        toValue: MIN_SCALE,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [scale, pan]);

  // + Yakınlaş
  const handleZoomIn = () => {
    const nextScale = Math.min(MAX_SCALE, currentScale.current + 0.35);
    setZoomPercent(Math.round(nextScale * 100));
    Animated.spring(scale, {
      toValue: nextScale,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  // - Uzaklaş
  const handleZoomOut = () => {
    const nextScale = Math.max(MIN_SCALE, currentScale.current - 0.35);
    setZoomPercent(Math.round(nextScale * 100));
    Animated.spring(scale, {
      toValue: nextScale,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  // İlk açılışta odaklan
  useEffect(() => {
    if (activeTree && typeof activeTree.position_x === 'number') {
      focusOnActiveTree();
    } else {
      focusOnCanvasPoint(CANVAS_SIZE / 2, CANVAS_SIZE / 2, DEFAULT_SCALE, false);
    }
  }, []);

  // Dışarıdan gelen koordinat odağı (Örn: "Haritada Göster"e tıklandığında)
  useEffect(() => {
    if (
      targetFocusCoord &&
      typeof targetFocusCoord.x === 'number' &&
      typeof targetFocusCoord.y === 'number'
    ) {
      const targetCenterX = targetFocusCoord.x * CELL_SIZE + CELL_SIZE / 2;
      const targetCenterY = targetFocusCoord.y * CELL_SIZE + CELL_SIZE / 2;
      setSelectedCoord({ x: targetFocusCoord.x, y: targetFocusCoord.y });
      focusOnCanvasPoint(targetCenterX, targetCenterY, 1.4, true);
      onTargetFocusHandled?.();
    }
  }, [targetFocusCoord, focusOnCanvasPoint, onTargetFocusHandled]);

  // Viewport ölçümünü bir kez alma
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewportRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      viewportScreenPos.current = {
        pageX: pageX || 0,
        pageY: pageY || 100,
        width: w || width,
        height: h || height,
      };
    });
  };

  // ==========================================
  // PanResponder (Ultra Hızlı, Sıfır Lag)
  // ==========================================
  const gestureStateRef = useRef<{
    startPan: { x: number; y: number };
    startScale: number;
    startPinchDist: number;
    startTime: number;
    startTouchesCount: number;
    lastTapTime: number;
  }>({
    startPan: { x: 0, y: 0 },
    startScale: DEFAULT_SCALE,
    startPinchDist: 0,
    startTime: 0,
    startTouchesCount: 0,
    lastTapTime: 0,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
      },
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        gestureStateRef.current.startTime = Date.now();
        gestureStateRef.current.startTouchesCount = touches.length;
        gestureStateRef.current.startPan = { ...currentPan.current };
        gestureStateRef.current.startScale = currentScale.current;

        if (touches.length === 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          gestureStateRef.current.startPinchDist = Math.hypot(
            t1.pageX - t2.pageX,
            t1.pageY - t2.pageY
          );
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;

        // 2 Parmakla Pinch-to-Zoom (Sıfır state re-render)
        if (touches.length === 2 && gestureStateRef.current.startPinchDist > 0) {
          const t1 = touches[0];
          const t2 = touches[1];
          const currentDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          const ratio = currentDist / gestureStateRef.current.startPinchDist;
          const nextScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, gestureStateRef.current.startScale * ratio)
          );
          scale.setValue(nextScale);
          return;
        }

        // 1 Parmakla Pan (Sürükleme)
        if (touches.length === 1) {
          const nextX = gestureStateRef.current.startPan.x + gesture.dx;
          const nextY = gestureStateRef.current.startPan.y + gesture.dy;
          const clamped = clampPan(nextX, nextY, currentScale.current);
          pan.setValue(clamped);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        // Hareket bittiğinde zoom yüzdesini güncelle (Sadece 1 kez)
        setZoomPercent(Math.round(currentScale.current * 100));

        const elapsed = Date.now() - gestureStateRef.current.startTime;
        const moveDist = Math.hypot(gesture.dx, gesture.dy);

        // Dokunma (Tap) Tespiti: Kısa süreli ve parmak sürüklenmediyse
        if (
          moveDist < 8 &&
          elapsed < 350 &&
          gestureStateRef.current.startTouchesCount === 1
        ) {
          const touchPageX = evt.nativeEvent.pageX;
          const touchPageY = evt.nativeEvent.pageY;

          const vp = viewportScreenPos.current;
          const vpCenterX = vp.pageX + vp.width / 2;
          const vpCenterY = vp.pageY + vp.height / 2;

          const touchRelX = touchPageX - vpCenterX;
          const touchRelY = touchPageY - vpCenterY;

          // Kanvasın gerçek (X, Y) koordinatına çevir
          const cx =
            CANVAS_SIZE / 2 +
            (touchRelX - currentPan.current.x) / currentScale.current;
          const cy =
            CANVAS_SIZE / 2 +
            (touchRelY - currentPan.current.y) / currentScale.current;

          const gx = Math.floor(cx / CELL_SIZE);
          const gy = Math.floor(cy / CELL_SIZE);

          // Çift dokunma kontrolü
          const now = Date.now();
          if (now - gestureStateRef.current.lastTapTime < 280) {
            handleZoomIn();
          }
          gestureStateRef.current.lastTapTime = now;

          // Tıklanan koordinat harita sınırları içindeyse seç
          if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
            setSelectedCoord({ x: gx, y: gy });
          } else {
            setSelectedCoord(null);
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* ==========================================
          İnteraktif 2D Harita Alanı (Hafif & Hızlı)
          ========================================== */}
      <View
        ref={viewportRef}
        style={styles.viewport}
        {...panResponder.panHandlers}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.canvas,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scale },
              ],
            },
          ]}
        >
          {/* Sade, Temiz, Hızlı Çimen Zemin (Ağır gölge veya grid yok) */}
          <View style={styles.terrainBackground}>
            {/* Dikili Ağaçlar */}
            {trees.map((tree) => {
              if (
                typeof tree.position_x !== 'number' ||
                typeof tree.position_y !== 'number'
              )
                return null;

              const isActive = activeTree && tree.id === activeTree.id;
              const level = getLevelForXP(tree.xp);
              const progress = getProgressToNextLevel(tree.xp);

              return (
                <View
                  key={tree.id}
                  style={[
                    styles.treeTile,
                    {
                      left: tree.position_x * CELL_SIZE,
                      top: tree.position_y * CELL_SIZE,
                    },
                  ]}
                >
                  {/* Aktif Ağaç Vurgusu */}
                  {isActive && <View style={styles.activeGlowRing} />}

                  {/* Ağaç Görseli */}
                  <TreeSVG
                    treeType={tree.tree_type as TreeType}
                    level={level}
                    progress={progress}
                    size={CELL_SIZE - 6}
                  />

                  {/* Seviye Rozeti */}
                  <View
                    style={[
                      styles.treeBadge,
                      isActive && styles.activeTreeBadge,
                    ]}
                  >
                    <Text style={styles.treeBadgeText}>
                      {isActive ? '🌟' : `S${level}`}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Seçili Parsel İmleci */}
            {selectedCoord && (
              <View
                style={[
                  styles.selectionCursor,
                  {
                    left: selectedCoord.x * CELL_SIZE,
                    top: selectedCoord.y * CELL_SIZE,
                  },
                ]}
              >
                {!selectedTree && (
                  <Text style={styles.cursorSeedHint}>🌱</Text>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* ==========================================
          Üst Floating HUD
          ========================================== */}
      <View pointerEvents="box-none" style={styles.topHud}>
        <View style={styles.hudBadge}>
          <Text style={styles.hudBadgeText}>🌲 {trees.length} Ağaç</Text>
          {selectedCoord && (
            <Text style={styles.hudCoordText}>
              • Parsel [{selectedCoord.x}, {selectedCoord.y}]
            </Text>
          )}
        </View>

        <View style={styles.hudZoomBadge}>
          <Text style={styles.hudZoomText}>🔍 {zoomPercent}%</Text>
        </View>
      </View>

      {/* ==========================================
          Sağ Taraf Floating Kontroller (+, -, 🎯, 🗺️)
          ========================================== */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleZoomIn}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnText}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleZoomOut}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnText}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.focusBtn]}
          onPress={focusOnActiveTree}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnIcon}>🎯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={zoomToOverview}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnIcon}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* ==========================================
          Alt Floating Kart (Parsel Denetçisi / Bilgi)
          ========================================== */}
      <View style={styles.bottomCardWrapper}>
        {selectedCoord ? (
          <Card elevated style={styles.inspectorCard}>
            {selectedTree ? (
              /* Dolu Parsel: Ağaç Bilgisi */
              <View>
                <View style={styles.inspectorHeader}>
                  <View style={styles.inspectorTag}>
                    <Text style={styles.inspectorTagText}>
                      Parsel [{selectedCoord.x}, {selectedCoord.y}]
                    </Text>
                  </View>
                  {isSelectedActive ? (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>🌱 Aktif Odak</Text>
                    </View>
                  ) : (
                    <View style={styles.archivePill}>
                      <Text style={styles.archivePillText}>🌳 Orman Ağacı</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setSelectedCoord(null)}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inspectorContent}>
                  <TreeSVG
                    treeType={selectedTree.tree_type as TreeType}
                    level={selectedLevel}
                    progress={selectedProgress}
                    size={56}
                  />

                  <View style={styles.inspectorMeta}>
                    <Text style={styles.inspectorTreeName}>
                      {selectedTreeInfo?.emoji} {selectedTreeInfo?.name}
                    </Text>
                    <Text style={styles.inspectorTreeStage}>
                      Seviye {selectedLevel} • {selectedStage?.name}
                    </Text>
                    <Text style={styles.inspectorTreeXP}>
                      {selectedTree.xp} XP
                    </Text>
                  </View>
                </View>

                <View style={styles.inspectorActions}>
                  {onFeedTree && (
                    <Button
                      title="💧 Besle"
                      onPress={() => onFeedTree(selectedTree)}
                      size="md"
                      style={{ flex: 0.9 }}
                    />
                  )}
                  {isSelectedActive ? (
                    <Button
                      title="⏱️ Odaklan"
                      onPress={() => router.push('/(tabs)/timer')}
                      variant={onFeedTree ? 'secondary' : 'primary'}
                      size="md"
                      style={{ flex: 1.1 }}
                    />
                  ) : (
                    <Button
                      title="🌱 Odak Yap"
                      onPress={() => onSetActiveTree(selectedTree.id)}
                      variant="secondary"
                      size="md"
                      style={{ flex: 1.1 }}
                    />
                  )}
                </View>
              </View>
            ) : (
              /* Boş Parsel: Ağaç Dikme Butonu */
              <View>
                <View style={styles.inspectorHeader}>
                  <View style={styles.inspectorTag}>
                    <Text style={styles.inspectorTagText}>
                      Boş Parsel [{selectedCoord.x}, {selectedCoord.y}]
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCoord(null)}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.emptyTitle}>🌱 Yeni Tohum Ekmeye Uygun</Text>
                <Text style={styles.emptyDesc}>
                  Bu parsele istediğin türde bir ağaç dikerek ada ormanını büyütebilirsin.
                </Text>

                <Button
                  title="🌱 Bu Noktaya Ağaç Dik"
                  onPress={() => onPlantAtTile(selectedCoord.x, selectedCoord.y)}
                  size="md"
                  style={{ marginTop: SPACING.xs }}
                />
              </View>
            )}
          </Card>
        ) : (
          /* Seçim Yokken Minimal İpucu Çubuğu */
          <View style={styles.tipBar}>
            <Text style={styles.tipText}>
              💡 1 parmakla sürükle, 2 parmakla veya +/- ile yaklaş. Ağaç dikmek için dokun!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ==========================================
// Stiller (Optimize & Hızlı)
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E4D2B',
    overflow: 'hidden',
    position: 'relative',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terrainBackground: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#40916C', // Sade, temiz, yüksek performanslı yeşil çimenlik
    borderRadius: 28,
    borderWidth: 10,
    borderColor: '#D8F3DC', // Sade kumsal sınırı
    position: 'relative',
  },
  treeTile: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlowRing: {
    position: 'absolute',
    width: CELL_SIZE + 6,
    height: CELL_SIZE + 6,
    borderRadius: (CELL_SIZE + 6) / 2,
    backgroundColor: 'rgba(255, 230, 109, 0.4)',
  },
  treeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  activeTreeBadge: {
    backgroundColor: COLORS.secondary,
  },
  treeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
  },
  selectionCursor: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 2,
    borderColor: '#FFE66D',
    backgroundColor: 'rgba(255, 230, 109, 0.25)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursorSeedHint: {
    fontSize: 20,
  },

  // Üst HUD
  topHud: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.9)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  hudBadgeText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  hudCoordText: {
    color: '#D8F3DC',
    fontFamily: FONTS.body,
    fontSize: 12,
    marginLeft: 4,
  },
  hudZoomBadge: {
    backgroundColor: 'rgba(27, 67, 50, 0.9)',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  hudZoomText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },

  // Sağ Floating Kontroller
  mapControls: {
    position: 'absolute',
    right: SPACING.md,
    top: 70,
    gap: 8,
    zIndex: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  controlBtnText: {
    fontSize: 22,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
    lineHeight: 26,
  },
  controlBtnIcon: {
    fontSize: 18,
  },
  focusBtn: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },

  // Alt Floating Kart
  bottomCardWrapper: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  inspectorCard: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    justifyContent: 'space-between',
  },
  inspectorTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  inspectorTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  activePill: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  activePillText: {
    color: '#856404',
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  archivePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  archivePillText: {
    color: '#6B7280',
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
  closeBtnText: {
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyBold,
  },
  inspectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  inspectorMeta: {
    flex: 1,
  },
  inspectorTreeName: {
    fontSize: 17,
    fontFamily: FONTS.heading,
    color: COLORS.text.primary,
  },
  inspectorTreeStage: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primary,
    marginTop: 2,
  },
  inspectorTreeXP: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  inspectorActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  tipBar: {
    backgroundColor: 'rgba(27, 67, 50, 0.92)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
  },
});
