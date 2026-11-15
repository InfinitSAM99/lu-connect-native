import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import ChatThemePicker from '../components/ChatThemePicker';
import { THEMES } from '../lib/chatThemes';

export default function ChatInfoScreen({ route, navigation }: any) {
  const { conversationId, otherUser, isBlocked: initialBlocked } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [isBlocked, setIsBlocked] = useState(initialBlocked || false);
  const [isMuted, setIsMuted] = useState(false);
  const [disappearing, setDisappearing] = useState('off');
  
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('classic');

  useEffect(() => {
    loadSettings();
  }, [conversationId, myId]);

  const loadSettings = async () => {
    if (!myId) return;
    const { data: member } = await supabase.from('conversation_members').select('is_muted, disappearing_duration, theme').eq('conversation_id', conversationId).eq('user_id', myId).maybeSingle();
    if (member) {
      setIsMuted(member.is_muted || false);
      setDisappearing(member.disappearing_duration || 'off');
      setActiveTheme(member.theme || 'classic');
    }
  };

  const toggleBlock = async () => {
    if (!myId || !otherUser?.id) return;
    const newStatus = !isBlocked;
    setIsBlocked(newStatus);

    try {
      if (newStatus) {
        await supabase.from('blocked_users').insert({ blocker_id: myId, blocked_id: otherUser.id });
        Toast.show({ type: 'error', text1: 'User Blocked' });
      } else {
        await supabase.from('blocked_users').delete().eq('blocker_id', myId).eq('blocked_id', otherUser.id);
        Toast.show({ type: 'success', text1: 'User Unblocked' });
      }
    } catch (e: any) {
      setIsBlocked(!newStatus);
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    }
  };

  const handleDisappearing = () => {
    Alert.alert('Disappearing Messages', 'Select duration', [
      { text: 'Off', onPress: () => saveDisappearing('off') },
      { text: '12 hours', onPress: () => saveDisappearing('12 hours') },
      { text: '24 hours', onPress: () => saveDisappearing('24 hours') },
      { text: '30 days', onPress: () => saveDisappearing('30 days') },
      { text: '90 days', onPress: () => saveDisappearing('90 days') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const saveDisappearing = async (val: string) => {
    setDisappearing(val);
    await supabase.from('conversation_members').update({ disappearing_duration: val }).eq('conversation_id', conversationId).eq('user_id', myId);
    Toast.show({ type: 'success', text1: 'Timer Updated' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Chat Info</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Image source={{ uri: otherUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.full_name || 'U'}` }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 12 }}>{otherUser?.full_name}</Text>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity onPress={() => setThemePickerOpen(true)} style={styles.row}>
            <View style={styles.iconBg}><Ionicons name="color-palette" size={20} color="#fff" /></View>
            <Text style={styles.rowText}>Change Theme</Text>
            <Ionicons name="chevron-forward" size={18} color="#6d7382" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDisappearing} style={styles.row}>
            <View style={styles.iconBg}><Ionicons name="timer-outline" size={20} color="#fff" /></View>
            <Text style={styles.rowText}>Disappearing Messages</Text>
            <Text style={{ color: '#6d7382', fontSize: 14 }}>{disappearing}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.iconBg}><Ionicons name="notifications" size={20} color="#fff" /></View>
            <Text style={[styles.rowText, { flex: 1 }]}>Mute Notifications</Text>
            <Switch value={isMuted} onValueChange={(v) => { setIsMuted(v); supabase.from('conversation_members').update({ is_muted: v }).eq('conversation_id', conversationId).eq('user_id', myId); }} trackColor={{ false: '#2a2a2a', true: '#ef4444' }} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Privacy & Support</Text>
          
          <TouchableOpacity onPress={toggleBlock} style={styles.row}>
            <View style={[styles.iconBg, { backgroundColor: isBlocked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name={isBlocked ? "lock-open" : "lock-closed"} size={20} color={isBlocked ? '#22c55e' : '#ef4444'} />
            </View>
            <Text style={[styles.rowText, { color: isBlocked ? '#22c55e' : '#ef4444' }]}>
              {isBlocked ? "Unblock User" : "Block User"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Toast.show({ type: 'success', text1: 'Report Sent' })} style={styles.row}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(245,158,11,0.15)' }]}><Ionicons name="warning" size={20} color="#f59e0b" /></View>
            <Text style={[styles.rowText, { color: '#f59e0b' }]}>Report User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ChatThemePicker 
        open={themePickerOpen} 
        current={activeTheme} 
        onSelect={(themeId) => {
          setThemePickerOpen(false);
          const isPremium = profile?.subscription_tier === 'premium';
          const isLocked = !isPremium && themeId !== 'default' && themeId !== 'classic';
          if (isLocked) { 
            Toast.show({ type: 'info', text1: 'Premium Required', text2: 'Upgrade to LU Pro to use this theme.' }); 
            return; 
          }
          const selectedTheme = THEMES[themeId as keyof typeof THEMES];
          if (selectedTheme) {
            navigation.navigate('ThemeCustomizerScreen', { theme: selectedTheme, conversationId });
          }
        }} 
        onClose={() => setThemePickerOpen(false)} 
        isPremium={profile?.subscription_tier === 'premium'} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: '#6d7382', fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  iconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
});
