import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function FacultyPickerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('faculties').select('*').order('group_name').order('name');
      if (!error && data) {
        const mapped = data.reduce((acc: any, item: any) => {
          const group = acc.find((g: any) => g.title === item.group_name);
          if (group) {
            group.data.push(item.name);
          } else {
            acc.push({ title: item.group_name, data: [item.name] });
          }
          return acc;
        }, []);
        setGroups(mapped);
      }
      setLoading(false);
    })();
  }, []);

  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return groups;

    return groups.map((group) => {
      const filteredData = group.data.filter((f: string) => f.toLowerCase().includes(term));
      return { ...group, data: filteredData };
    }).filter((group) => group.data.length > 0);
  }, [q, groups]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SELECT YOUR FACULTY</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#6d7382" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search faculty..."
          placeholderTextColor="#6d7382"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')}>
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
        keyExtractor={(item, index) => item + index}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => {
              // If a callback was passed via params, call it
              if (route.params?.onSelect) {
                route.params.onSelect(item);
                navigation.goBack();
              } else {
                // Fallback if opened from elsewhere
                navigation.navigate('ProfileEnforcer', { selectedFaculty: item });
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.itemText}>{item}</Text>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No faculties found.</Text>
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#141414', marginHorizontal: 16,
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14, marginLeft: 10 },

  sectionHeader: {
    color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  itemText: { color: '#fff', fontSize: 15, flex: 1, paddingRight: 10 },
});
