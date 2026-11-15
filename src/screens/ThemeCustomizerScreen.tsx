import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { tapLight } from '../lib/haptics';

export default function ThemeCustomizerScreen({ route, navigation }: any) {
  const { theme, conversationId } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [blur, setBlur] = useState(0);
  const [brightness, setBrightness] = useState(16);
  const [darkOverlay, setDarkOverlay] = useState(40);
  const [saturation, setSaturation] = useState(100);

  const handleApply = async () => {
    tapLight();
    if (!conversationId || !profile?.id) return;

    const { error } = await supabase.from('conversation_members').update({
      theme: theme.id,
      theme_blur: blur,
      theme_brightness: brightness,
      theme_dark_overlay: darkOverlay,
      theme_saturation: saturation,
    }).eq('conversation_id', conversationId).eq('user_id', profile.id);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } else {
      Toast.show({ type: 'success', text1: 'Theme Applied', text2: 'Your chat background is updated!' });
      navigation.goBack();
    }
  };

  const resetSettings = () => {
    setBlur(0);
    setBrightness(16);
    setDarkOverlay(40);
    setSaturation(100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Chat Appearance" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}>
        
        <Text style={styles.sectionTitle}>Live Preview</Text>
        <View style={styles.previewContainer}>
          <Image source={theme.image} style={[styles.previewImage, { opacity: brightness / 100 }]} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(0,0,0,${darkOverlay / 100})` }]} />
          {blur > 0 && <BlurView intensity={blur} tint="dark" style={StyleSheet.absoluteFillObject} />}
          {saturation !== 100 && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(255,255,255,${Math.abs(100 - saturation) / 200})` }]} />}
          
          <View style={styles.demoBubbleLeft}><Text style={{ color: '#fff', fontSize: 12 }}>Hello! 👋</Text></View>
          <View style={styles.demoBubbleRight}><Text style={{ color: '#fff', fontSize: 12 }}>Hey there!</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Adjustments</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingHeader}><Text style={styles.settingLabel}>Blur</Text><Text style={styles.settingValue}>{Math.round(blur)}px</Text></View>
          <Slider style={styles.slider} minimumValue={0} maximumValue={100} value={blur} onValueChange={setBlur} minimumTrackTintColor="#FFD700" maximumTrackTintColor="#333" thumbTintColor="#FFD700" />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingHeader}><Text style={styles.settingLabel}>Brightness</Text><Text style={styles.settingValue}>{Math.round(brightness)}%</Text></View>
          <Slider style={styles.slider} minimumValue={0} maximumValue={100} value={brightness} onValueChange={setBrightness} minimumTrackTintColor="#FFD700" maximumTrackTintColor="#333" thumbTintColor="#FFD700" />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingHeader}><Text style={styles.settingLabel}>Dark Overlay</Text><Text style={styles.settingValue}>{Math.round(darkOverlay)}%</Text></View>
          <Slider style={styles.slider} minimumValue={0} maximumValue={80} value={darkOverlay} onValueChange={setDarkOverlay} minimumTrackTintColor="#FFD700" maximumTrackTintColor="#333" thumbTintColor="#FFD700" />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingHeader}><Text style={styles.settingLabel}>Saturation</Text><Text style={styles.settingValue}>{Math.round(saturation)}%</Text></View>
          <Slider style={styles.slider} minimumValue={0} maximumValue={200} value={saturation} onValueChange={setSaturation} minimumTrackTintColor="#FFD700" maximumTrackTintColor="#333" thumbTintColor="#FFD700" />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.resetBtn} onPress={resetSettings}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}><Text style={styles.applyText}>Use these settings</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  previewContainer: { height: 220, borderRadius: 20, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#2a2a2a' },
  previewImage: { width: '100%', height: '100%' },
  demoBubbleLeft: { position: 'absolute', top: 30, left: 20, backgroundColor: 'rgba(31,31,31,0.8)', padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  demoBubbleRight: { position: 'absolute', bottom: 30, right: 20, backgroundColor: 'rgba(239,68,68,0.9)', padding: 12, borderRadius: 16, borderBottomRightRadius: 4 },
  settingRow: { marginBottom: 20 },
  settingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  settingValue: { color: '#FFD700', fontSize: 14, fontWeight: '700' },
  slider: { width: '100%', height: 40 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  resetBtn: { flex: 1, backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  resetText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  applyBtn: { flex: 2, backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
