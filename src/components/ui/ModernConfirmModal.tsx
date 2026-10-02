import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

interface ModernConfirmModalProps {
  visible: boolean;
  icon?: string;
  badge?: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ModernConfirmModal({
  visible,
  icon = '🌱',
  badge,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  children,
}: ModernConfirmModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 20) + SPACING.md },
              ]}
            >
              {/* Drag Handle Çubuğu */}
              <View style={styles.dragPill} />

              {/* İkon Rozeti */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{icon}</Text>
              </View>

              {badge && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}

              {/* Başlık ve Mesaj */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* İsteğe bağlı özel içerik (örn. Ağaç önizleme kartı) */}
              {children && <View style={styles.customContent}>{children}</View>}

              {/* Butonlar */}
              <View style={styles.actions}>
                <Button
                  title={confirmText}
                  onPress={onConfirm}
                  variant={confirmVariant}
                  size="lg"
                  style={styles.confirmBtn}
                />

                <TouchableOpacity
                  onPress={onCancel}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 28, 21, 0.65)', // Karartılmış zümrüt arka plan
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl + 8,
    borderTopRightRadius: RADIUS.xl + 8,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
    shadowColor: '#081C15',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#D8F3DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconText: {
    fontSize: 32,
  },
  badgePill: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#856404',
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 21,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs + 2,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
  },
  customContent: {
    width: '100%',
    marginVertical: SPACING.md,
  },
  actions: {
    width: '100%',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  confirmBtn: {
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#6B7280',
  },
});
