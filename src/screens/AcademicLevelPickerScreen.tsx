import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SectionList, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function AcademicLevelPickerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('academic_levels').select('*').order('group_name');
      if (!error && data) {
        const mapped = data.reduce((acc: any, item: any) => {
          const group = acc.find((g: any) => g.title === item.group_name);
          if (group) {
            group.data.push({ label: item.name, value: item.code });
          } else {
            acc.push({ title: item.group_name, data: [{ label: item.name, value: item.code }] });
          }
          return acc;
        }, []);
        setGroups(mapped);
      }
      setLoading(false);
    })();
  }, []);

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;

    return groups.map((group) => {
      const filteredData = group.data.filter((item: any) =>
        item.label.toLowerCase().includes(term) || item.value.toLowerCase().includes(term)
      );
      return { ...group, data: filteredData };
    }).filter((group) => group.data.length > 0);
  }, [search, groups]);

  const handleSelect = (item: any) => {
    if (route.params?.onSelect) {
      route.params.onSelect(item.label); // We save the label for display
      navigation.goBack();
    } else {
      navigation.navigate('ProfileEnforcer', { selectedLevel: item.label });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* LU LOGO HERO */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoTextLU}>LU</Text>
        </View>
        <Text style={styles.logoTextConnect}>LU CONNECT</Text>
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACADEMIC LEVEL</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#6d7382" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search level or code..."
          placeholderTextColor="#6d7382"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6d7382" />
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.value + index}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemCode}>{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No levels found.</Text>
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  hero: { alignItems: 'center', marginTop: 10, marginBottom: 16 },
  logoBox: { width: 60, height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 8 },
  logoTextLU: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 12, fontWeight: '800', letterSpacing: 3 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#1f1f1f' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14, marginLeft: 10 },

  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  itemLabel: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  itemCode: { color: '#6d7382', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});
