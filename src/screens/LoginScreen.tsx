import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import AuthErrorSheet from '../components/AuthErrorSheet';

export default function LoginScreen({ navigation }: any) {
  const { kickoutReason } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{ visible: boolean; title: string; message: string; showReset: boolean }>({ visible: false, title: '', message: '', showReset: false });

  useEffect(() => {
    if (kickoutReason) {
      setAuthError({ visible: true, title: 'Session Ended', message: kickoutReason, showReset: false });
    }
  }, [kickoutReason]);

  const handleWebLogin = async () => {
    setLoading(true);
    try {
      // 1. In development (Expo Go), this returns: exp://192.168.x.x:8081/--/auth-callback
      // 2. In production (APK), this returns: luconnectnative://auth-callback
      const redirectUrl = Linking.createURL('auth-callback');
      
      // We pass the redirect URL to the website as a query param
      const webUrl = `https://lu-connect-website-sigma.vercel.app/login?redirect=${encodeURIComponent(redirectUrl)}`;

      // We open the session with the same redirect URL as the expected return URL
      const res = await WebBrowser.openAuthSessionAsync(webUrl, redirectUrl, {
        toolbarColor: '#000000',
        controlsColor: '#ffffff',
        showInRecents: true,
      });

      if (res.type === 'success' && res.url) {
        const url = res.url;
        // Expo Go uses exp://...#access_token=...
        // Production uses luconnectnative://auth-callback#access_token=...
        // In both cases, splitting by '#' gets the tokens
        const hashIndex = url.indexOf('#');
        if (hashIndex > -1) {
          const params = new URLSearchParams(url.substring(hashIndex + 1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { supabase } = await import('../lib/supabase');
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }
        }
      }
    } catch (e: any) {
      setAuthError({ visible: true, title: 'Error', message: e.message, showReset: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Svg viewBox="0 0 200 200" width={120} height={120}>
            <Rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#ef4444" strokeWidth={5} />
            <Path d="M 62 60 L 62 130 L 96 130" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.title}>LU CONNECT</Text>
          <Text style={styles.subtitle}>Connect with your university community</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleWebLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </Svg>
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerLogo}>
          <View style={styles.divider} />
          <Image source={require('../../assets/images/infinit_logo.png')} style={{ width: 240, height: 90, resizeMode: 'contain', marginBottom: 10 }} />
          <Text style={styles.poweredBy}>INFINIT CO ACCOUNT</Text>
        </View>
      </ScrollView>

      <AuthErrorSheet
        visible={authError.visible}
        title={authError.title}
        message={authError.message}
        showReset={authError.showReset}
        onClose={() => setAuthError({ ...authError, visible: false })}
        onReset={() => setAuthError({ ...authError, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: 0.5, marginTop: 18 },
  subtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', maxWidth: 280, marginTop: 8, lineHeight: 20 },
  actions: { width: '100%', maxWidth: 380, alignSelf: 'center', marginVertical: 40 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414', borderColor: '#2a2a2a', borderWidth: 1, borderRadius: 16, paddingVertical: 16, gap: 10 },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  footerLogo: { alignItems: 'center', width: '100%' },
  divider: { height: 1, width: 200, backgroundColor: '#1f1f1f', marginBottom: 30 },
  poweredBy: { color: '#6d7382', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },
});
