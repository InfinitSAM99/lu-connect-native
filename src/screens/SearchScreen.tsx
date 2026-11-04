import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';

const RECENT_KEY = 'lu:recent-searches';
const TABS = ['people', 'posts', 'groups', 'events'];

async function runSearch(tab: string, q: string, myId: string) {
  const term = (q || '').trim();
  
  // If the user hasn't typed anything, only return a default list for the People tab
  if (!term && tab !== 'people') return [];

  if (tab === 'people') {
    let req = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, faculty, course, is_verified, is_bot')
      .neq('id', myId || '00000000-0000-0000-0000-000000000000')
      .eq('is_bot', false)
      .limit(50);
      
    if (term) {
      req = req.ilike('full_name', `%${term}%`);
    } else {
      req = req.order('last_seen', { ascending: false, nullsFirst: false });
    }

    const { data } = await req;
    return data || [];
  }
  if (tab === 'posts') {
    const { data } = await supabase.from('posts').select('id, content, created_at, post_media(media_url), profiles:author_id(id, full_name, avatar_url)').ilike('content', `%${term}%`).eq('is_deleted', false).order('created_at', { ascending: false }).limit(30);
    return data || [];
  }
  if (tab === 'groups') {
    const { data } = await supabase.from('groups').select('id, name, description, cover_url, member_count').ilike('name', `%${term}%`).limit(30);
    return data || [];
  }
  if (tab === 'events') {
    const { data } = await supabase.from('events').select('id, title, description, starts_at, location, cover_url').ilike('title', `%${term}%`).order('starts_at', { ascending: true }).limit(30);
    return data || [];
  }
  return [];
}


export default function SearchScreen({ navigation }: any) {
  const { profile } = useAuth();
  const myId = profile?.id || null;
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState('');
  const [tab, setTab] = useState('people');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) setRecent(JSON.parse(raw));
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const searchQuery = useQuery({
    queryKey: ['search', tab, debounced, myId],
    enabled: debounced.length > 0 || tab === 'people',
    staleTime: 30000,
    queryFn: async () => {
      if (debounced) saveRecent(debounced);
      return runSearch(tab, debounced, myId);
    },
  });

  const results = searchQuery.data || [];
  const loading = searchQuery.isFetching;
  const showEmpty = !debounced && tab !== 'people' && results.length === 0;
  const showNoResults = (debounced || tab === 'people') && !loading && results.length === 0 && searchQuery.data !== undefined;

  const saveRecent = async (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recent.filter((r) => r.q !== term)].slice(0, 5);
    const recentItems = updated.map((r) => ({
      tab: r.tab || 'people',
      q: r.q,
      name: r.q,
    }));
    setRecent(recentItems);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recentItems));
  };

  const applyRecent = (entry: any) => {
    setTab(entry.tab);
    setQ(entry.q);
  };

  const clearRecent = () => {
    setRecent([]);
    AsyncStorage.removeItem(RECENT_KEY);
  };

  const renderResult = ({ item: r }: any) => {
    if (tab === 'people') {
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Profile', { id: r.id })}>
          <Image source={{ uri: r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.full_name}` }} style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontWeight: '600', color: '#fff', fontSize: 15 }}>{r.full_name}</Text>
              {r.is_verified && <VerifiedBadge size={14} />}
            </View>
            <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{r.faculty || r.course || 'Student'}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    if (tab === 'posts') {
      const thumb = r.post_media?.[0]?.media_url;
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PostDetail', { id: r.id })}>
          <Image source={{ uri: r.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.profiles?.full_name}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 12, color: '#6d7382' }}>{r.profiles?.full_name}</Text>
            <Text style={{ fontSize: 14, color: '#fff', marginTop: 2 }} numberOfLines={3}>{r.content}</Text>
          </View>
          {thumb && <Image source={{ uri: thumb }} style={{ width: 60, height: 60, borderRadius: 8, marginLeft: 8 }} />}
        </TouchableOpacity>
      );
    }
    if (tab === 'groups') {
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GroupDetail', { id: r.id })}>
          <Image source={{ uri: r.cover_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.name}` }} style={{ width: 44, height: 44, borderRadius: 12 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '600', color: '#fff', fontSize: 15 }}>{r.name}</Text>
            <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }} numberOfLines={1}>{r.description || `${r.member_count} members`}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    if (tab === 'events') {
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('EventDetail', { id: r.id })}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: '#fff', fontSize: 15 }}>{r.title}</Text>
            <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 4 }}>
              {r.starts_at ? new Date(r.starts_at).toLocaleString() : ''}{r.location ? ` · ${r.location}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#fff" />
          <TextInput style={styles.searchInput} placeholder="Search LU CONNECT…" placeholderTextColor="#6d7382" value={q} onChangeText={setQ} autoFocus />
          {q ? <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close" size={18} color="#fff" /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        {TABS.map((t) => {
          const active = tab === t;
          const icon = t === 'people' ? 'people' : t === 'posts' ? 'image' : t === 'groups' ? 'people-circle' : 'calendar';
          return (
            <TouchableOpacity key={t} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Ionicons name={icon as any} size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6, textTransform: 'capitalize' }}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showEmpty && recent.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ flex: 1, color: '#6d7382', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Recent</Text>
            <TouchableOpacity onPress={clearRecent}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Clear</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((r, i) => (
              <TouchableOpacity key={i} style={styles.recentChip} onPress={() => applyRecent(r)}>
                <Text style={{ color: '#fff', fontSize: 12 }}>{r.q} · {r.tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showEmpty && recent.length === 0 && (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Ionicons name="search" size={40} color="#6d7382" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 }}>Start searching</Text>
          <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', marginTop: 6, paddingHorizontal: 40 }}>Find students, posts, groups and events.</Text>
        </View>
      )}

      {loading && debounced && <ActivityIndicator color="#ef4444" style={{ marginTop: 20 }} />}

      {showNoResults && (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>No results for "{debounced}"</Text>
        </View>
      )}

            {results.length > 0 && (<FlatList
          data={results}
          keyExtractor={(item: any) => item.id}
          renderItem={renderResult}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#141414' },
  tabBtnActive: { backgroundColor: '#ef4444' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  recentChip: { backgroundColor: '#141414', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
});
