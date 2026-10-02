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

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

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
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
    } else {
      Alert.alert(
        '🎉 Hoş Geldin!',
        'Hesabın oluşturuldu. E-postanı doğruladıktan sonra giriş yapabilirsin.',
        [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <LinearGradient colors={[COLORS.background, '#D8F3DC']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>🌱</Text>
            <Text style={styles.appName}>Ormanını Başlat</Text>
            <Text style={styles.tagline}>İlk ağacını dikmek için kayıt ol</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Kayıt Ol</Text>

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
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 64, marginBottom: SPACING.sm },
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
