import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md', loading, disabled, style
}: ButtonProps) {
  const variantStyle = styles[`variant_${variant}`];
  const textStyle = styles[`text_${variant}`];
  const sizeStyle = styles[`size_${size}`];
  const textSizeStyle = styles[`textSize_${size}`];

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, sizeStyle, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : COLORS.primary} size="small" />
      ) : (
        <Text style={[styles.text, textStyle, textSizeStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  text: { fontFamily: FONTS.bodyBold },
  variant_primary: { backgroundColor: COLORS.primary },
  variant_secondary: { backgroundColor: COLORS.secondary },
  variant_ghost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary },
  variant_danger: { backgroundColor: COLORS.danger },
  text_primary: { color: '#fff' },
  text_secondary: { color: '#fff' },
  text_ghost: { color: COLORS.primary },
  text_danger: { color: '#fff' },
  size_sm: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md },
  size_md: { paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.lg },
  size_lg: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});
