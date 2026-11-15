import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TopBar from '../components/TopBar';

const { width: SCREEN_W } = Dimensions.get('window');

const RANGES = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
];

export default function ProfessionalDashboardScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [rangeKey, setRangeKey] = useState('30');
  const [loading, setLoading] = useState(true);
  
  const [totals, setTotals] = useState({ followers: 0, posts: 0, likes: 0, comments: 0 });
  const [deltas, setDeltas] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>({ sampleSize: 0, topFaculty: null, topYear: null, peakHour: null });

  const currentRange = RANGES.find(r => r.key === rangeKey) || RANGES[1];

  useEffect(() => {
    if (!profile?.id) return;
    
    const fetchRealData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Followers
        const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id);
        
        // 2. Fetch Posts
        const { count: postsCount, data: userPosts } = await supabase.from('posts').select('id', { count: 'exact' }).eq('author_id', profile.id).eq('is_deleted', false);
        const postIds = userPosts?.map(p => p.id) || [];

        // 3. Fetch Totals
        let totalLikes = 0;
        let totalComments = 0;
        if (postIds.length > 0) {
          const { count: likesCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', postIds);
          const { count: commentsCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).in('post_id', postIds);
          totalLikes = likesCount || 0;
          totalComments = commentsCount || 0;
        }

        setTotals({
          followers: followersCount || 0,
          posts: postsCount || 0,
          likes: totalLikes,
          comments: totalComments,
        });

        // 4. REAL Deltas (Last N days)
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - currentRange.days);
        
        // Build a map of all days in range
        const daysMap: Record<string, any> = {};
        for (let i = currentRange.days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const iso = d.toISOString().split('T')[0];
          daysMap[iso] = { day: iso, newLikes: 0, newComments: 0, newFollowers: 0 };
        }

        // Fetch real likes in range
        if (postIds.length > 0) {
          const { data: likesData } = await supabase.from('likes').select('created_at').in('post_id', postIds).gte('created_at', startDate.toISOString());
          likesData?.forEach(l => {
            const iso = l.created_at.split('T')[0];
            if (daysMap[iso]) daysMap[iso].newLikes += 1;
          });

          const { data: commentsData } = await supabase.from('comments').select('created_at').in('post_id', postIds).gte('created_at', startDate.toISOString());
          commentsData?.forEach(c => {
            const iso = c.created_at.split('T')[0];
            if (daysMap[iso]) daysMap[iso].newComments += 1;
          });
        }

        // Fetch real followers in range
        const { data: followersData } = await supabase.from('follows').select('created_at, follower_id, profiles!follower_id(faculty, year_of_study)').eq('following_id', profile.id).gte('created_at', startDate.toISOString());
        followersData?.forEach(f => {
          const iso = f.created_at.split('T')[0];
          if (daysMap[iso]) daysMap[iso].newFollowers += 1;
        });

        setDeltas(Object.values(daysMap));

        // 5. REAL Audience (All followers)
        const { data: allFollowers } = await supabase.from('follows').select('created_at, profiles!follower_id(faculty, year_of_study)').eq('following_id', profile.id);
        
        if (allFollowers && allFollowers.length > 0) {
          const faculties: Record<string, number> = {};
          const years: Record<string, number> = {};
          
          allFollowers.forEach(f => {
            const p = f.profiles as any;
            if (p?.faculty) faculties[p.faculty] = (faculties[p.faculty] || 0) + 1;
            if (p?.year_of_study) years[String(p.year_of_study)] = (years[String(p.year_of_study)] || 0) + 1;
          });

          const topFaculty = Object.entries(faculties).sort((a, b) => b[1] - a[1])[0];
          const topYear = Object.entries(years).sort((a, b) => b[1] - a[1])[0];

          setAudience({
            sampleSize: allFollowers.length,
            topFaculty: topFaculty ? { name: topFaculty[0], count: topFaculty[1] } : null,
            topYear: topYear ? { year: topYear[0], count: topYear[1] } : null,
          });
        } else {
          setAudience({ sampleSize: 0 });
        }

      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchRealData();
  }, [profile?.id, rangeKey]);

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  if (!profile.professional_mode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title="Dashboard" showBack={true} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="stats-chart" size={64} color="#6d7382" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Professional Mode required</Text>
          <Text style={{ color: '#6d7382', fontSize: 14, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 }}>Enable Professional Mode to see your analytics dashboard.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ProfessionalMode')}>
            <Text style={styles.primaryBtnText}>Enable Professional Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Chart geometry
  const chartWidth = SCREEN_W - 64;
  const chartHeight = 160;
  
  // Use max of all values so lines are visible even if likes are 0
  const maxLikes = Math.max(...deltas.map((d: any) => d.newLikes), 5);
  const maxComments = Math.max(...deltas.map((d: any) => d.newComments), 5);

  const linePathLikes = deltas.map((d: any, i: number) => {
    const x = deltas.length > 1 ? (i / (deltas.length - 1)) * chartWidth : 0;
    const y = chartHeight - (d.newLikes / maxLikes) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const linePathComments = deltas.map((d: any, i: number) => {
    const x = deltas.length > 1 ? (i / (deltas.length - 1)) * chartWidth : 0;
    const y = chartHeight - (d.newComments / maxComments) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar hero title="Dashboard" subtitle={`Analytics for @${profile.username || profile.full_name?.split(' ')[0]?.toLowerCase()}`} showBack={true} onBack={() => navigation.goBack()} rightComponent={<Ionicons name="stats-chart" size={48} color="#ef4444" style={{ marginTop: 4 }} />} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          {RANGES.map(r => (
            <TouchableOpacity key={r.key} onPress={() => setRangeKey(r.key)} style={[styles.rangeBtn, rangeKey === r.key && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
              <Text style={{ fontSize: 12, color: rangeKey === r.key ? '#fff' : '#aab0bd', fontWeight: '500' }}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 }}>
          <StatTile icon="people" label="Followers" value={totals.followers} />
          <StatTile icon="image" label="Posts" value={totals.posts} />
          <StatTile icon="heart" label="Total likes" value={totals.likes} />
          <StatTile icon="chatbubble" label="Total comments" value={totals.comments} />
        </View>

        <Text style={styles.sectionHeader}>Engagement · last {currentRange.label}</Text>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          {loading ? <ActivityIndicator color="#ef4444" style={{ padding: 20 }} /> : (
            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f1f1f' }}>
              <Svg width={chartWidth} height={chartHeight}>
                <Line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
                <Path d={linePathLikes} fill="none" stroke="#ef4444" strokeWidth="3" />
                <Path d={linePathComments} fill="none" stroke="#22c55e" strokeWidth="3" />
              </Svg>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: '#ef4444' }} /><Text style={{ fontSize: 12, color: '#6d7382' }}>Likes</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: '#22c55e' }} /><Text style={{ fontSize: 12, color: '#6d7382' }}>Comments</Text></View>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionHeader}>Audience</Text>
        <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
          {audience.sampleSize === 0 ? (
            <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center', backgroundColor: '#141414', borderRadius: 12 }}>Audience insights unlock as you gain followers.</Text>
          ) : (
            <>
              <AudienceRow label="Top faculty" value={audience.topFaculty ? `${audience.topFaculty.name} (${audience.topFaculty.count})` : '—'} />
              <AudienceRow label="Most common year" value={audience.topYear ? `Year ${audience.topYear.year} (${audience.topYear.count})` : '—'} />
              <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 10 }}>Based on {audience.sampleSize} follower{audience.sampleSize === 1 ? '' : 's'}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ icon, label, value }: any) {
  return (
    <View style={styles.statTile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={18} color="#6d7382" />
        <Text style={{ fontSize: 12, color: '#6d7382' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 6 }}>{value.toLocaleString()}</Text>
    </View>
  );
}

function AudienceRow({ label, value }: any) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
      <Text style={{ fontSize: 14, color: '#6d7382' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#fff', fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1f1f1f', backgroundColor: '#0a0a0a' },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontWeight: '500', color: '#6d7382' },
  statTile: { flex: 1, minWidth: '45%', backgroundColor: '#141414', borderRadius: 12, padding: 14 },
});
