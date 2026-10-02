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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { signUp, signInWithGoogle, signInAnonymously } = useAuth();

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Hata', 'Tüm alanlar gerekli.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    setLoading(true);
    const { data, error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
    } else {
      if (data?.session) {
        // Oturum otomatik açıldıysa direkt ana sayfaya
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          '🎉 Tebrikler!',
          'Hesabınız başarıyla oluşturuldu. Eğer e-posta doğrulaması açıksa gelen kutunuzu kontrol edip ardından giriş yapabilirsiniz.',
          [{ text: 'Giriş Yap', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      const res = await signInWithGoogle();
      setGoogleLoading(false);
      if (res?.error) {
        Alert.alert(
          'Google ile Kayıt',
          res.error.message || 'Google hesabı bağlanırken bir sorun oluştu.'
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
          <View style={styles.header}>
            <Text style={styles.logo}>🌱</Text>
            <Text style={styles.appName}>Ormanını Başlat</Text>
            <Text style={styles.tagline}>İlk ağacını dikmek için hemen başla</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Kayıt Ol</Text>

            {/* Google ile Tek Tıkla Kayıt */}
            <GoogleButton
              onPress={handleGoogleSignup}
              loading={googleLoading}
              title="Google ile Hızlı Başla"
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
                {guestLoading ? 'Başlatılıyor...' : 'Kayıtsız Hemen Başla (Misafir)'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya form ile kaydol</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="ormancı42"
                placeholderTextColor={COLORS.text.muted}
                autoCapitalize="none"
              />
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
              title="Ormanımı Oluştur 🌳"
              onPress={handleRegister}
              loading={loading}
              style={styles.button}
              size="lg"
            />

            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => router.back()}
            >
              <Text style={styles.link}>
                Zaten hesabın var mı? <Text style={styles.linkBold}>Giriş Yap</Text>
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
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  logo: { fontSize: 64, marginBottom: SPACING.xs },
  appName: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  tagline: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.text.secondary },
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
