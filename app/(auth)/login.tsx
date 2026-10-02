import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/features/auth/use-auth';
import { Button } from '../../src/components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

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

  return (
    <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌳</Text>
            <Text style={styles.appName}>StudyForest</Text>
            <Text style={styles.tagline}>Çalış, büyüt, ormanını yarat</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Giriş Yap</Text>

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
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
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
    marginBottom: SPACING.lg,
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
  button: { marginTop: SPACING.sm },
  linkContainer: { alignItems: 'center', marginTop: SPACING.md },
  link: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.text.secondary },
  linkBold: { fontFamily: FONTS.bodyBold, color: COLORS.primary },
});
