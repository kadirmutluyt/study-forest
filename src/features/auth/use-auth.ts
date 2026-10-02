import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

// In-app web browser oturumunu sonlandırmak için çağrılır
WebBrowser.maybeCompleteAuthSession();

// Profil kaydının veritabanında var olduğundan emin olan yardımcı fonksiyon
export async function ensureProfile(userId: string, username?: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!data) {
      await supabase.from('profiles').upsert({
        id: userId,
        username: username || 'Ormancı',
        total_xp: 0,
        streak_days: 0,
      });
    }
  } catch (err) {
    console.warn('ensureProfile warning:', err);
  }
}

// OAuth URL'inden token veya code ayıklayıp oturumu başlatan fonksiyon
async function processAuthUrl(url: string): Promise<{ success: boolean; error?: any }> {
  try {
    const parsed = Linking.parse(url);
    const queryParams = (parsed.queryParams || {}) as Record<string, string>;

    let rawCode: string | undefined = typeof queryParams.code === 'string' ? queryParams.code : undefined;
    let rawAccessToken: string | undefined = typeof queryParams.access_token === 'string' ? queryParams.access_token : undefined;
    let rawRefreshToken: string | undefined = typeof queryParams.refresh_token === 'string' ? queryParams.refresh_token : undefined;

    // URL hash'inde token arama (Implicit flow fallback)
    if (!rawCode && !rawAccessToken && url.includes('#')) {
      const hashPart = url.split('#')[1];
      if (hashPart) {
        const hashParams = new URLSearchParams(hashPart);
        rawAccessToken = hashParams.get('access_token') || undefined;
        rawRefreshToken = hashParams.get('refresh_token') || undefined;
        rawCode = hashParams.get('code') || rawCode;
      }
    }

    const code = typeof rawCode === 'string' ? rawCode : Array.isArray(rawCode) ? rawCode[0] : undefined;
    const access_token = typeof rawAccessToken === 'string' ? rawAccessToken : Array.isArray(rawAccessToken) ? rawAccessToken[0] : undefined;
    const refresh_token = typeof rawRefreshToken === 'string' ? rawRefreshToken : Array.isArray(rawRefreshToken) ? rawRefreshToken[0] : undefined;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { success: false, error };
      if (data?.session?.user) {
        await ensureProfile(
          data.session.user.id,
          data.session.user.user_metadata?.username ||
          data.session.user.user_metadata?.full_name ||
          data.session.user.user_metadata?.name
        );
      }
      return { success: true };
    }

    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) return { success: false, error };
      if (data?.session?.user) {
        await ensureProfile(
          data.session.user.id,
          data.session.user.user_metadata?.username ||
          data.session.user.user_metadata?.full_name ||
          data.session.user.user_metadata?.name
        );
      }
      return { success: true };
    }

    return { success: false, error: new Error('Doğrulama kodu veya oturum tokenı bulunamadı.') };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        ensureProfile(
          session.user.id,
          session.user.user_metadata?.username ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name
        );
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await ensureProfile(
          session.user.id,
          session.user.user_metadata?.username ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          (session.user.is_anonymous ? 'Misafir Ormancı' : undefined)
        );
      }
    });

    // Deep link yakalayıcı (OAuth browser dönüşü)
    const linkSubscription = Linking.addEventListener('url', (event) => {
      if (event.url && (event.url.includes('code=') || event.url.includes('access_token='))) {
        processAuthUrl(event.url);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      await ensureProfile(data.user.id, data.user.user_metadata?.username);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (!error && data?.user) {
      if (data.session) {
        await ensureProfile(data.user.id, username);
      }
    }

    return { data, error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'study-forest',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };
      if (!data?.url) return { error: new Error('Giriş adresi oluşturulamadı.') };

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success' && res.url) {
        const { error: processError } = await processAuthUrl(res.url);
        if (processError) return { error: processError };
        return { success: true };
      } else if (res.type === 'cancel' || res.type === 'dismiss') {
        return { cancelled: true };
      }

      return { error: new Error('Giriş tamamlanamadı.') };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error };
      if (data?.user) {
        await ensureProfile(data.user.id, 'Misafir Ormancı');
      }
      return { data, error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously,
    signOut,
  };
}
