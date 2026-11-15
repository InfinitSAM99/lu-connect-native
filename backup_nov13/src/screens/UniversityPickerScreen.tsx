import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function UniversityPickerScreen({ navigation, route, onSelect, onClose }: any) {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const returnTo = params.returnTo;
  const { user, profile, setProfile, reloadProfile } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: universities, isLoading } = useQuery({
    queryKey: ['universities'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, short_name, region, county')
        .order('region', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Group by region for SectionList
  const sections = React.useMemo(() => {
    const filtered = (universities || []).filter((u: any) =>
      !q.trim() || u.name.toLowerCase().includes(q.toLowerCase()) || (u.short_name || '').toLowerCase().includes(q.toLowerCase())
    );
    const byRegion: Record<string, any[]> = {};
    filtered.forEach((u: any) => {
      const key = u.region || 'Other';
      if (!byRegion[key]) byRegion[key] = [];
      byRegion[key].push(u);
    });
    return Object.keys(byRegion).sort().map((region) => ({
      title: `${region.toUpperCase()} REGION`,
      data: byRegion[region],
    }));
  }, [universities, q]);

  const handlePick = async (item: any) => {
    // 🔥 FIX: If this picker was opened by a parent (like the Feed), ONLY trigger onSelect.
    // Do not save to the profile database.
    if (onSelect) {
      onSelect(item);
      return;
    }

    // Otherwise (e.g. onboarding), save to DB
    setSaving(true);
    try {
      if (user?.id) {
        const { error } = await supabase.from('profiles').update({
          university_id: item.id,
          university_name: item.name,
        }).eq('id', user.id);
        if (error) throw new Error(error.message);

        if (setProfile && profile) {
          setProfile({ ...profile, university_id: item.id, university_name: item.name });
        }

        if (reloadProfile) await reloadProfile();
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }

      if (returnTo === 'Login') {
        navigation.navigate({ name: 'Login', params: { pickedUniversity: item }, merge: true });
      } else if (returnTo === 'ProfileEdit') {
        navigation.navigate({ name: 'ProfileEdit', params: { pickedUniversity: item }, merge: true });
      } else {
        if (navigation.canGoBack()) navigation.goBack();
        else if (onClose) onClose();
      }
    } catch (e: any) {
      console.error('SAVE ERROR:', e);
      alert('Failed to save university: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (onClose) onClose();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>BROWSE UNIVERSITIES</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#6d7382" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search university..."
            placeholderTextColor="#6d7382"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
          />
        </View>
      </View>

      {saving ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" size="large" />
          <Text style={{ color: '#6d7382', marginTop: 12 }}>Saving...</Text>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handlePick(item)} style={styles.row}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.short_name || item.name.slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.county ? `${item.county} County` : 'Kenya'}{item.short_name ? ` · ${item.short_name}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12 },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  badge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },
});
