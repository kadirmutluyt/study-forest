import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/use-auth';
import { Button } from '../../src/components/ui/Button';
import { GoogleButton } from '../../src/components/ui/GoogleButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { signIn, signInWithGoogle, signInAnonymously } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Giriş Hatası', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const res = await signInWithGoogle();
      setGoogleLoading(false);
      if (res?.error) {
        Alert.alert(
          'Google ile Giriş Hatası',
          res.error.message || 'Google ile giriş tamamlanamadı. Supabase üzerinde Google Provider ayarlarını kontrol ediniz.'
        );
      }
    } catch (err: any) {
      setGoogleLoading(false);
      Alert.alert('Hata', err.message || 'Beklenmeyen bir hata oluştu.');
    }
  };

  const handleGuestLogin = async () => {
    try {
      setGuestLoading(true);
      const { error } = await signInAnonymously();
      setGuestLoading(false);
      if (error) {
        Alert.alert(
          'Misafir Girişi',
          error.message || 'Misafir girişi için Supabase panelinde Anonymous Sign-in özelliğini aktifleştirin.'
        );
      }
    } catch (err: any) {
      setGuestLoading(false);
      Alert.alert('Hata', err.message || 'Giriş yapılamadı.');
    }
  };

  return (
    <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(insets.top, 20) + SPACING.md,
              paddingBottom: Math.max(insets.bottom, 20) + SPACING.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌳</Text>
            <Text style={styles.appName}>StudyForest</Text>
            <Text style={styles.tagline}>Çalış, büyüt, ormanını yarat</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Giriş Yap</Text>

            {/* Kolay / Hızlı Giriş Seçenekleri */}
            <GoogleButton
              onPress={handleGoogleLogin}
              loading={googleLoading}
              title="Google ile Devam Et"
              style={styles.googleBtn}
            />

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={guestLoading || googleLoading || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBtnEmoji}>⚡</Text>
              <Text style={styles.guestBtnText}>
                {guestLoading ? 'Giriş yapılıyor...' : 'Hızlı Giriş (Misafir Modu)'}
              </Text>
            </TouchableOpacity>

            {/* Ayrım Çizgisi */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya e-posta ile</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.text.muted}
                secureTextEntry
              />
            </View>

            <Button
              title="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
              size="lg"
            />

            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.link}>
                Hesabın yok mu? <Text style={styles.linkBold}>Kayıt Ol</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 72, marginBottom: SPACING.sm },
  appName: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  googleBtn: {
    marginBottom: SPACING.sm + 2,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  guestBtnEmoji: {
    fontSize: 16,
    marginRight: SPACING.xs + 2,
  },
  guestBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm + 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
    marginHorizontal: SPACING.sm + 2,
  },
  inputGroup: { marginBottom: SPACING.md },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  button: { marginTop: SPACING.xs },
  linkContainer: { alignItems: 'center', marginTop: SPACING.md },
  link: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.text.secondary },
  linkBold: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
});
