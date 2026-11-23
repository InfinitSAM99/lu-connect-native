import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
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
  const [rangeKey, setRangeKey] = useState('7');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totals, setTotals] = useState({ followers: 0, posts: 0, likes: 0, comments: 0 });
  const [deltas, setDeltas] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>({ sampleSize: 0, topFaculty: null, topYear: null });

  const currentRange = RANGES.find(r => r.key === rangeKey) || RANGES[0];

  const fetchRealData = async () => {
    if (!profile?.id) return;
    try {
      // 1. Fetch Followers
      const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id);

      // 2. Fetch Posts
      const { count: postsCount, data: userPosts } = await supabase.from('posts').select('id').eq('author_id', profile.id).eq('is_deleted', false);
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

      const daysMap: Record<string, any> = {};
      for (let i = currentRange.days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        // For short display on chart
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        daysMap[iso] = { day: iso, label, newLikes: 0, newComments: 0 };
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

      setDeltas(Object.values(daysMap));

      // 5. REAL Audience
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRealData();
  }, [profile?.id, rangeKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRealData();
  };

  if (!profile) return <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>;

  if (!profile.professional_mode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title="Dashboard" showBack={true} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="stats-chart" size={64} color="#6d7382" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Professional Mode Required</Text>
          <Text style={{ color: '#6d7382', fontSize: 14, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 }}>Enable Professional Mode to unlock your analytics dashboard.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ProfessionalMode')}>
            <Text style={styles.primaryBtnText}>Enable Professional Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- CHART GEOMETRY ---
  const chartWidth = SCREEN_W - 48; 
  const chartHeight = 200;
  const paddingX = 16;

  // Find the absolute max across BOTH likes and comments to scale properly
  const maxVal = Math.max(
    ...deltas.map((d: any) => Math.max(d.newLikes, d.newComments)),
    5 // Minimum scale so it doesn't break if everything is 0
  );

  const generatePath = (dataKey: string) => {
    return deltas.map((d: any, i: number) => {
      const x = deltas.length > 1 ? (i / (deltas.length - 1)) * (chartWidth - paddingX * 2) + paddingX : paddingX;
      const y = chartHeight - (d[dataKey] / maxVal) * (chartHeight - 40) - 20; // 20px padding top/bottom
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const pathLikes = generatePath('newLikes');
  const pathComments = generatePath('newComments');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        hero 
        title="Analytics" 
        subtitle={`@${profile.username || profile.full_name?.split(' ')[0]?.toLowerCase()}`} 
        showBack={true} 
        onBack={() => navigation.goBack()} 
        rightComponent={<Ionicons name="stats-chart" size={32} color="#ef4444" />} 
      />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
      >

        {/* RANGE SELECTOR */}
        <View style={styles.rangeContainer}>
          {RANGES.map(r => (
            <TouchableOpacity 
              key={r.key} 
              onPress={() => setRangeKey(r.key)} 
              style={[styles.rangeBtn, rangeKey === r.key && styles.rangeBtnActive]}
            >
              <Text style={[styles.rangeText, rangeKey === r.key && styles.rangeTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STAT TILES */}
        <View style={styles.statsGrid}>
          <StatTile icon="people" label="Followers" value={totals.followers} />
          <StatTile icon="image" label="Posts" value={totals.posts} />
          <StatTile icon="heart" label="Likes" value={totals.likes} />
          <StatTile icon="chatbubble" label="Comments" value={totals.comments} />
        </View>

        {/* GRAPH SECTION */}
        <Text style={styles.sectionHeader}>Engagement overview</Text>
        <View style={styles.chartCard}>
          {loading ? (
            <ActivityIndicator color="#ef4444" style={{ height: chartHeight }} />
          ) : (
            <>
              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#ef4444" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#22c55e" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#22c55e" stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {/* Grid Lines */}
                <Line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <Line x1="0" y1={chartHeight - 20} x2={chartWidth} y2={chartHeight - 20} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Filled Areas */}
                <Path d={`${pathLikes} L ${chartWidth - paddingX} ${chartHeight} L ${paddingX} ${chartHeight} Z`} fill="url(#gradLikes)" />
                <Path d={`${pathComments} L ${chartWidth - paddingX} ${chartHeight} L ${paddingX} ${chartHeight} Z`} fill="url(#gradComments)" />

                {/* Lines */}
                <Path d={pathLikes} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinejoin="round" />
                <Path d={pathComments} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinejoin="round" />

                {/* End Dots */}
                {deltas.length > 0 && (
                  <>
                    <Circle cx={chartWidth - paddingX} cy={chartHeight - (deltas[deltas.length-1].newLikes / maxVal) * (chartHeight - 40) - 20} r="4" fill="#ef4444" />
                    <Circle cx={chartWidth - paddingX} cy={chartHeight - (deltas[deltas.length-1].newComments / maxVal) * (chartHeight - 40) - 20} r="4" fill="#22c55e" />
                  </>
                )}
              </Svg>
              
              {/* X Axis Labels (Show first and last date) */}
              <View style={styles.axisLabels}>
                <Text style={styles.axisText}>{deltas[0]?.label || ''}</Text>
                <Text style={styles.axisText}>{deltas[deltas.length - 1]?.label || ''}</Text>
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Likes</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>Comments</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* AUDIENCE SECTION */}
        <Text style={styles.sectionHeader}>Audience Insights</Text>
        <View style={styles.audienceCard}>
          {audience.sampleSize === 0 ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Ionicons name="people-outline" size={32} color="#6d7382" style={{ marginBottom: 10 }} />
              <Text style={{ color: '#6d7382', fontSize: 14, textAlign: 'center' }}>Audience insights unlock as you gain followers.</Text>
            </View>
          ) : (
            <>
              <AudienceRow icon="school" label="Top Faculty" value={audience.topFaculty ? `${audience.topFaculty.name}` : '—'} badge={audience.topFaculty?.count} />
              <AudienceRow icon="calendar" label="Most Common Year" value={audience.topYear ? `Year ${audience.topYear.year}` : '—'} badge={audience.topYear?.count} />
              <View style={styles.audienceFooter}>
                <Text style={styles.audienceFooterText}>Based on {audience.sampleSize} total follower{audience.sampleSize === 1 ? '' : 's'}</Text>
              </View>
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
      <View style={styles.statTileHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={16} color="#ef4444" />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    </View>
  );
}

function AudienceRow({ icon, label, value, badge }: any) {
  return (
    <View style={styles.audienceRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon} size={18} color="#6d7382" />
        <Text style={styles.audienceLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.audienceValue}>{value}</Text>
        {badge !== undefined && badge !== null && (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  rangeContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 16 },
  rangeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', backgroundColor: '#0a0a0a', alignItems: 'center' },
  rangeBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  rangeText: { fontSize: 13, color: '#6d7382', fontWeight: '600' },
  rangeTextActive: { color: '#fff' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  statTile: { flex: 1, minWidth: '45%', backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 13, color: '#6d7382', fontWeight: '500' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, fontWeight: '700', color: '#fff' },
  
  chartCard: { marginHorizontal: 16, backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 16 },
  axisText: { fontSize: 11, color: '#6d7382', fontWeight: '500' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: '#aab0bd', fontWeight: '500' },

  audienceCard: { marginHorizontal: 16, backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  audienceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  audienceLabel: { fontSize: 14, color: '#6d7382', fontWeight: '500' },
  audienceValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
  badge: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  audienceFooter: { paddingTop: 14 },
  audienceFooterText: { fontSize: 12, color: '#6d7382', textAlign: 'center' }
});
