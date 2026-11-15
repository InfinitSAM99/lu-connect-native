import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, RefreshControl, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LULogo from '../components/LULogo';
import AcademicUploadModal from '../components/AcademicUploadModal';

const PAGE_SIZE = 15;

export default function AcademicHubScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [myUploads, setMyUploads] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from('academic_posts')
      .select('*, profiles:author_id(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (myUploads && profile?.id) {
      query = query.eq('author_id', profile.id);
    } else if (filter === 'mine' && profile?.university_id) {
      query = query.eq('university_id', profile.university_id);
    }
    
    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      // Filter out any video posts just in case they exist in DB
      setPosts(data.filter((p: any) => p.media_type !== 'video'));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [filter, myUploads, profile?.university_id]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (post: any) => {
    Alert.alert('Delete Material', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(post.id);
        await supabase.from('academic_posts').delete().eq('id', post.id);
        try {
          const urlParts = post.media_url.split('/academic-files/');
          if (urlParts.length > 1) await supabase.storage.from('academic-files').remove([urlParts[1]]);
        } catch (e) {}
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        setDeleting(null);
      }}
    ]);
  };

  const renderItem = ({ item }: any) => {
    return (
      <View style={styles.feedRow}>
        {/* HEADER */}
        <View style={styles.feedHeader}>
          <Image source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profiles?.full_name}` }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.authorName}>{item.profiles?.full_name || 'Student'}</Text>
            <Text style={styles.postMeta}>{item.course} · {item.year_of_study}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: item.media_type === 'pdf' ? 'rgba(239,68,68,0.15)' : item.media_type === 'audio' ? 'rgba(168,85,247,0.15)' : 'rgba(34,197,94,0.15)' }]}>
            <Text style={[styles.typeBadgeText, { color: item.media_type === 'pdf' ? '#ef4444' : item.media_type === 'audio' ? '#a855f7' : '#22c55e' }]}>{item.media_type.toUpperCase()}</Text>
          </View>
        </View>

        {/* CONTENT */}
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={styles.postTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.postDesc}>{item.description}</Text> : null}
        </View>

        {/* MEDIA DISPLAY */}
        {item.media_type === 'pdf' ? (
          <TouchableOpacity 
            style={styles.pdfRow} 
            onPress={() => navigation.navigate('AcademicViewer', { url: item.media_url, type: 'pdf', title: item.title })}
            activeOpacity={0.7}
          >
            <View style={styles.pdfIconWrap}>
              <Ionicons name="document-text" size={32} color="#ef4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pdfName} numberOfLines={1}>{item.file_name || 'Document.pdf'}</Text>
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginTop: 2 }}>TAP TO OPEN PDF</Text>
            </View>
            <Ionicons name="download-outline" size={24} color="#6d7382" />
          </TouchableOpacity>
        ) : item.media_type === 'image' ? (
          <Image source={{ uri: item.media_url }} style={styles.mediaImage} resizeMode="cover" />
        ) : (
          <TouchableOpacity style={styles.audioBar} onPress={() => navigation.navigate('AcademicViewer', { url: item.media_url, type: 'audio', title: item.title })}>
            <Ionicons name="play-circle" size={36} color="#a855f7" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Lecture Audio</Text>
              <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>Tap to listen</Text>
            </View>
          </TouchableOpacity>
        )}

        {myUploads && (
          <TouchableOpacity onPress={() => handleDelete(item)} disabled={deleting === item.id} style={styles.deleteBtn}>
            <Ionicons name="trash" size={16} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>Delete Material</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LULogo size={36} animate={false} />
          <Text style={styles.brandText}>ACADEMIC HUB</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.plusBtn}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowUpload(true)} style={styles.plusBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH */}
      {showSearch && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#6d7382" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search past papers, notes..."
            placeholderTextColor="#6d7382"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadData}
            autoFocus
          />
        </View>
      )}

      {/* FILTERS */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f1f1f', backgroundColor: '#000' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <TouchableOpacity onPress={() => { setMyUploads(false); setFilter('mine'); }} style={[styles.filterPill, !myUploads && filter === 'mine' && styles.filterPillActive]}>
            <Text style={[styles.filterText, !myUploads && filter === 'mine' && styles.filterTextActive]}>{profile?.university_name || 'My University'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMyUploads(false); setFilter('all'); }} style={[styles.filterPill, !myUploads && filter === 'all' && styles.filterPillActive]}>
            <Text style={[styles.filterText, !myUploads && filter === 'all' && styles.filterTextActive]}>All Universities</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMyUploads(true)} style={[styles.filterPill, myUploads && styles.filterPillActive]}>
            <Text style={[styles.filterText, myUploads && styles.filterTextActive]}>My Uploads</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* FEED */}
      {loading && posts.length === 0 ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
          ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No materials found.</Text>}
        />
      )}

      <AcademicUploadModal visible={showUpload} onClose={() => setShowUpload(false)} onUploaded={loadData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  stickyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', zIndex: 100 },
  brandText: { fontSize: 20, fontWeight: '900', color: '#ef4444', letterSpacing: -0.5 },
  plusBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, marginLeft: 8 },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderRadius: 20 },
  filterPillActive: { backgroundColor: '#ef4444' },
  filterText: { color: '#6d7382', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  feedRow: { paddingVertical: 14 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  authorName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  postMeta: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  
  postTitle: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  postDesc: { color: '#aab0bd', fontSize: 15, lineHeight: 22 },

  pdfRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  pdfIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  pdfName: { color: '#fff', fontSize: 15, fontWeight: '600' },

  mediaImage: { width: '100%', height: 300, marginTop: 4 },

  audioBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#0a0a0a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f1f1f' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginTop: 14 },
});
