import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const SECTIONS = [
  {
    title: 'App control',
    rows: [
      { key: 'maintenance', label: 'Maintenance mode', desc: 'Block all users from the app', type: 'toggle' },
      { key: 'maintenance_message', label: 'Maintenance message', desc: 'Shown to users when blocked', type: 'text' },
      { key: 'min_app_version', label: 'Minimum app version', desc: 'Force users to update', type: 'text' },
    ],
  },
  {
    title: 'Bot activity',
    rows: [
      { key: 'bots_enabled', label: 'Bots enabled', desc: 'Master switch for all bot activity', type: 'toggle' },
      { key: 'post_frequency_minutes', label: 'Post interval', desc: 'Minutes between bot posts', type: 'number' },
      { key: 'reply_posts_enabled', label: 'Reply to posts', desc: 'Bots comment on user posts', type: 'toggle' },
      { key: 'reply_enabled', label: 'Reply to comments', desc: 'Bots reply to user comments', type: 'toggle' },
      { key: 'dm_enabled', label: 'Reply to DMs', desc: 'Bots respond to direct messages', type: 'toggle' },
      { key: 'daily_post_limit', label: 'Daily post limit', desc: 'Max bot posts per day', type: 'number' },
      { key: 'daily_comment_limit', label: 'Daily comment limit', desc: 'Max bot comments per day', type: 'number' },
      { key: 'run_tick', label: 'Run bot tick now', desc: 'Trigger bot activity manually', type: 'action' },
    ],
  },
  {
    title: 'Moderation',
    rows: [
      { key: 'ai_moderation_enabled', label: 'AI moderation', desc: 'Auto-flag inappropriate content', type: 'toggle' },
      { key: 'auto_approve_signups', label: 'Auto-approve signups', desc: 'Skip manual approval of new users', type: 'toggle' },
    ],
  },
  {
    title: 'Boosts',
    rows: [
      { key: 'boosts_enabled', label: 'Boosts enabled', desc: 'Allow students to buy boosts', type: 'toggle' },
      { key: 'boost_auto_approve', label: 'Auto-approve boosts', desc: 'Start delivery without review', type: 'toggle' },
    ],
  },
  {
    title: 'Feature flags',
    rows: [
      { key: 'feature_video', label: 'Video tab', desc: 'Show the video section in the app', type: 'toggle' },
      { key: 'feature_events', label: 'Events', desc: 'Show events in the app', type: 'toggle' },
      { key: 'feature_groups', label: 'Groups', desc: 'Show groups in the app', type: 'toggle' },
      { key: 'feature_ai_assistant', label: 'AI Assistant', desc: 'Show LU CONNECT Assistant', type: 'toggle' },
    ],
  },
  {
    title: 'App Updates',
    rows: [
      { key: 'force_update', label: 'Release New Update', desc: 'Upload APK and force users to update', type: 'action' },
    ],
  },
  {
    title: 'Notifications',
    rows: [
      { key: 'welcome_notification', label: 'Welcome notification', desc: 'Send a welcome message to new users', type: 'toggle' },
    ],
  },
];

export default function AdminSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [app, setApp] = useState<any>({});
  const [bot, setBot] = useState<any>({});
  const [botCount, setBotCount] = useState(0);
  const [botPostsToday, setBotPostsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  const [editModal, setEditModal] = useState<any>(null);
  const [draft, setDraft] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (appData) setApp(appData);

    const { data: botData } = await supabase.from('bot_config').select('*').eq('id', 1).maybeSingle();
    if (botData) setBot(botData);

    const { count: bc } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_bot', true);
    setBotCount(bc || 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: botIds } = await supabase.from('profiles').select('id').eq('is_bot', true);
    if (botIds && botIds.length > 0) {
      const ids = botIds.map((b) => b.id);
      const { count: tp } = await supabase.from('posts').select('*', { count: 'exact', head: true }).in('author_id', ids).gte('created_at', since);
      setBotPostsToday(tp || 0);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getValue = (key: string) => {
    const botKeys = ['bots_enabled','post_frequency_minutes','reply_posts_enabled','reply_enabled','dm_enabled','daily_post_limit','daily_comment_limit'];
    if (botKeys.includes(key)) {
      if (key === 'bots_enabled') return bot.enabled;
      return bot[key];
    }
    return app[key];
  };

  const toggleSwitch = async (key: string, val: boolean) => {
    setBusy(true);
    const botKeys = ['bots_enabled','reply_posts_enabled','reply_enabled','dm_enabled'];
    
    if (botKeys.includes(key)) {
      const field = key === 'bots_enabled' ? 'enabled' : key;
      const { error } = await supabase.from('bot_config').update({ [field]: val, updated_at: new Date().toISOString() }).eq('id', 1);
      if (!error) setBot((b: any) => ({ ...b, [field]: val }));
      else Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase.from('app_settings').update({ [key]: val, updated_at: new Date().toISOString() }).eq('id', 1);
      if (!error) setApp((a: any) => ({ ...a, [key]: val }));
      else Alert.alert('Error', error.message);
    }
    setBusy(false);
  };

  const openEdit = (row: any) => {
    if (row.type === 'action') return;
    setEditModal(row);
    setDraft(String(getValue(row.key) ?? ''));
  };

  const saveValue = async () => {
    if (!editModal) return;
    setBusy(true);
    const key = editModal.key;
    const botNumberKeys = ['post_frequency_minutes','daily_post_limit','daily_comment_limit'];

    if (botNumberKeys.includes(key)) {
      const num = Math.max(1, Math.min(10000, Number(draft) || 1));
      const { error } = await supabase.from('bot_config').update({ [key]: num, updated_at: new Date().toISOString() }).eq('id', 1);
      if (!error) setBot((b: any) => ({ ...b, [key]: num }));
      else Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase.from('app_settings').update({ [key]: draft, updated_at: new Date().toISOString() }).eq('id', 1);
      if (!error) setApp((a: any) => ({ ...a, [key]: draft }));
      else Alert.alert('Error', error.message);
    }
    setBusy(false);
    setEditModal(null);
  };

  const handleAction = (key: string) => {
    if (key === 'force_update') {
      navigation.navigate('AppUpdater');
    } else if (key === 'run_tick') {
      runBotTick();
    }
  };

  const runBotTick = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('bot-tick', { body: {} });
      if (error) throw error;
      Alert.alert('Success', 'Bot tick ran successfully.');
      await load();
    } catch (e: any) {
      Alert.alert('Tick Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}><Text style={styles.logoTextLU}>LU</Text></View>
          <Text style={styles.logoTextConnect}>SETTINGS</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* STATS STRIP */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{botCount}</Text>
              <Text style={styles.statLabel}>bots</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{botPostsToday}</Text>
              <Text style={styles.statLabel}>posts / 24h</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bot.post_frequency_minutes || 10}</Text>
              <Text style={styles.statLabel}>min interval</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* SECTIONS */}
          {SECTIONS.map((section) => (
            <View key={section.title} style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              {section.rows.map((row) => {
                const val = getValue(row.key);
                const isToggle = row.type === 'toggle';
                const isOn = !!val;

                return (
                  <TouchableOpacity 
                    key={row.key} 
                    style={styles.rowItem} 
                    onPress={() => row.type === 'action' ? handleAction(row.key) : openEdit(row)}
                    activeOpacity={0.7}
                    disabled={isToggle || busy} // Toggles handled by switch
                  >
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowDesc}>{row.desc}</Text>
                    </View>

                    {isToggle ? (
                      <Switch 
                        value={isOn} 
                        onValueChange={(v) => toggleSwitch(row.key, v)} 
                        trackColor={{ false: '#1f1f1f', true: 'rgba(34,197,94,0.5)' }}
                        thumbColor={isOn ? '#22c55e' : '#6d7382'}
                      />
                    ) : row.type === 'action' ? (
                      <Ionicons name="play-circle" size={28} color="#ef4444" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.rowValue} numberOfLines={1}>
                          {String(val || '—').slice(0, 15)}{String(val || '').length > 15 ? '...' : ''}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#1f1f1f" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

        </ScrollView>
      )}

      {/* EDIT MODAL */}
      <Modal visible={!!editModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.drawerHandle} />
            
            {editModal && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editModal.label}</Text>
                  <TouchableOpacity onPress={() => setEditModal(null)} style={{ padding: 8 }}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{editModal.desc}</Text>

                <View style={{ padding: 20 }}>
                  <TextInput
                    style={[styles.input, editModal.key === 'maintenance_message' && { height: 100, textAlignVertical: 'top' }]}
                    value={draft}
                    onChangeText={setDraft}
                    keyboardType={editModal.type === 'number' ? 'numeric' : 'default'}
                    multiline={editModal.key === 'maintenance_message'}
                    placeholder="Enter value..."
                    placeholderTextColor="#6d7382"
                  />
                  
                  <TouchableOpacity style={styles.saveBtn} onPress={saveValue} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },

  statsStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#6d7382', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#1f1f1f' },

  sectionTitle: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 16, marginBottom: 12 },
  
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#0a0a0a' },
  rowLabel: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  rowDesc: { color: '#6d7382', fontSize: 13 },
  rowValue: { color: '#6d7382', fontSize: 14, maxWidth: 100 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalDesc: { color: '#6d7382', fontSize: 14, paddingHorizontal: 20, marginTop: 8, lineHeight: 20 },
  
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  saveBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
