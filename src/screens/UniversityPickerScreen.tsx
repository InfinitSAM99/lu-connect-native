import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

export default function UniversityPickerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const returnTo = route.params?.returnTo;

  const { data: universities, isLoading } = useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('universities').select('id, name, short_name, region, county').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const list = universities || [];
  const filtered = q.trim()
    ? list.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.short_name?.toLowerCase().includes(q.toLowerCase()))
    : list;

  const regions = ['Nairobi', 'Central', 'Rift Valley', 'Nyanza', 'Western', 'Eastern', 'Coast', 'Virtual'];
  const sections = regions.map(region => ({
    title: region,
    data: filtered.filter(u => u.region === region)
  })).filter(s => s.data.length > 0);

  const renderItem = ({ item }: any) => (
    <FastButton 
      style={styles.row} 
      onPress={() => { 
        if (returnTo === 'ProfileEdit') {
          navigation.navigate({ name: 'ProfileEdit', params: { pickedUniversity: { name: item.name, id: item.id } }, merge: true });
        } else {
          navigation.goBack();
        }
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>{(item.short_name || item.name).slice(0, 3).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
        <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>{item.county} County · {item.short_name}</Text>
      </View>
    </FastButton>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Choose University" showBack={true} onBack={() => navigation.goBack()} />
      
      <View style={{ padding: 16 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6d7382" />
          <TextInput 
            style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 8 }} 
            placeholder="Search university..." 
            placeholderTextColor="#6d7382"
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title.toUpperCase()} REGION</Text>
          )}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#6d7382', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0f0f0f' },
});
