import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { subDays, subHours, subYears, isSameDay } from 'date-fns';

const { width: SCREEN_W } = Dimensions.get('window');

const FILTERS = [
  { label: 'Last 24 Hours', value: '24h', days: 1 },
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 28 Days', value: '28d', days: 28 },
  { label: 'Last 90 Days', value: '90d', days: 90 },
  { label: 'Last Year', value: '1y', days: 365 },
];

const TABS = ['Overview', 'Audience', 'Content', 'Payout'];

export default function ProfessionalDashboardScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [filter, setFilter] = useState(FILTERS[2]); 
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real Data State
  const [totals, setTotals] = useState({ reach: 0, likes: 0, comments: 0, followers: 0, following: 0 });
  const [topPost, setTopPost] = useState<any>(null);
  const [recentFollowers, setRecentFollowers] = useState<any[]>([]);
  const [latestPost, setLatestPost] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filter.days);
    const isoStart = startDate.toISOString();

    try {
      // 1. Followers & Following
      const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id);
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id);

      // 2. Top Posts (Using our RPC)
      const { data: topPosts } = await supabase.rpc('get_top_posts', { user_id: profile.id, days_back: filter.days });
      if (topPosts && topPosts.length > 0) setTopPost(topPosts[0]);

      // 3. Latest Post
      const { data: latest } = await supabase.from('posts').select('*').eq('author_id', profile.id).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).single();
      if (latest) setLatestPost(latest);

      // 4. Recent Followers
      const { data: recentF } = await supabase.from('follows').select('created_at, profiles!follower_id(id, full_name, username, avatar_url)').eq('following_id', profile.id).order('created_at', { ascending: false }).limit(5);
      if (recentF) setRecentFollowers(recentF);

      // 5. Engagement Totals
      const { data: userPosts } = await supabase.from('posts').select('id').eq('author_id', profile.id).eq('is_deleted', false);
      const postIds = userPosts?.map(p => p.id) || [];
      
      let totalLikes = 0;
      let totalComments = 0;
      if (postIds.length > 0) {
        const { count: lCount } = await supabase.from('reactions').select('*', { count: 'exact', head: true }).in('post_id', postIds);
        const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).in('post_id', postIds);
        totalLikes = lCount || 0;
        totalComments = cCount || 0;
      }

      setTotals({
        reach: (followersCount || 0) * 10, // Mock reach calculation
        likes: totalLikes,
        comments: totalComments,
        followers: followersCount || 0,
        following: followingCount || 0
      });

      // 6. Mock Chart Data based on totals
      const mockChart = Array.from({ length: 10 }).map((_, i) => ({ value: Math.max(10, (totalLikes / 10) + (Math.random() * 50)) }));
      setChartData(mockChart);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [profile?.id, filter]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (!profile) return <View style={styles.center}><ActivityIndicator color="#a855f7" /></View>;

  // Payout Calculation Logic
  const calculateEarnings = () => {
    // Ksh 10 for every 10 followers, Ksh 5 for every 50 likes
    const followerEarnings = Math.floor(totals.followers / 10) * 10;
    const engagementEarnings = Math.floor((totals.likes + totals.comments) / 50) * 5;
    return followerEarnings + engagementEarnings;
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator color="#a855f7" style={{ marginTop: 50 }} />;

    switch (activeTab) {
      case 'Overview':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              <View style={styles.statCard}><Ionicons name="eye" size={20} color="#a855f7" /><Text style={styles.statValue}>{totals.reach}</Text><Text style={styles.statLabel}>Reach</Text></View>
              <View style={styles.statCard}><Ionicons name="heart" size={20} color="#ec4899" /><Text style={styles.statValue}>{totals.likes}</Text><Text style={styles.statLabel}>Likes</Text></View>
              <View style={styles.statCard}><Ionicons name="chatbubble" size={20} color="#3b82f6" /><Text style={styles.statValue}>{totals.comments}</Text><Text style={styles.statLabel}>Comments</Text></View>
            </ScrollView>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Reach Overview</Text>
              <Text style={styles.chartSub}>Growth over {filter.label}</Text>
              <View style={{ marginTop: 20, marginLeft: -10 }}>
                <LineChart data={chartData} color="#a855f7" areaChart startFillColor="#a855f7" startOpacity={0.3} endOpacity={0} hideDataPoints thickness={3} yAxisColor="transparent" xAxisColor="#1f1f1f" rulesColor="#1f1f1f" spacing={(SCREEN_W - 100) / chartData.length} height={150} />
              </View>
            </View>

            {/* TOP CONTENT CARD */}
            <Text style={styles.sectionHeader}>Top Content</Text>
            {topPost ? (
              <View style={styles.postCard}>
                <View style={styles.postImagePlaceholder}><Ionicons name="image" size={24} color="#6d7382" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.postContent} numberOfLines={2}>{topPost.content || 'Image Post'}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '700' }}>❤ {topPost.reaction_count} reactions</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ color: '#6d7382', paddingHorizontal: 20 }}>No posts in this timeframe.</Text>
            )}
          </ScrollView>
        );

      case 'Content':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={styles.chartTitle}>Daily Posting Target</Text>
                  <Text style={styles.chartSub}>Post 14 times to boost earnings</Text>
                </View>
                <View style={styles.badge}><Text style={styles.badgeText}>0/14</Text></View>
              </View>
              <View style={{ height: 12, backgroundColor: '#1f1f1f', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '0%', backgroundColor: '#a855f7', borderRadius: 6 }} />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('CreatePost')}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Create New Post</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>Latest Post Performance</Text>
            {latestPost ? (
              <View style={styles.postCard}>
                 <View style={styles.postImagePlaceholder}><Ionicons name="image" size={24} color="#6d7382" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.postContent} numberOfLines={2}>{latestPost.content || 'Image Post'}</Text>
                  <Text style={{ color: '#6d7382', fontSize: 11, marginTop: 4 }}>Posted on {new Date(latestPost.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: '#6d7382', paddingHorizontal: 20 }}>You haven't posted yet.</Text>
            )}
          </ScrollView>
        );

      case 'Audience':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Audience Growth</Text>
              <Text style={styles.chartSub}>Followers vs Following</Text>
              <View style={{ marginTop: 20, marginLeft: -10 }}>
                <LineChart data={chartData} data2={chartData.map(d => ({ value: d.value * 0.5 }))} color1="#a855f7" color2="#3b82f6" areaChart startOpacity={0.2} endOpacity={0} hideDataPoints thickness={3} yAxisColor="transparent" xAxisColor="#1f1f1f" rulesColor="#1f1f1f" spacing={(SCREEN_W - 100) / chartData.length} height={180} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#a855f7' }} /><Text style={{ color: '#fff', fontSize: 12 }}>Followers ({totals.followers})</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' }} /><Text style={{ color: '#fff', fontSize: 12 }}>Following ({totals.following})</Text></View>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Recent Followers</Text>
            <View style={{ paddingHorizontal: 20 }}>
              {recentFollowers.length > 0 ? recentFollowers.map((f, i) => (
                <View key={i} style={styles.followerRow}>
                  <Image source={{ uri: f.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{f.profiles?.full_name}</Text>
                    <Text style={{ color: '#6d7382', fontSize: 12 }}>@{f.profiles?.username}</Text>
                  </View>
                  <Text style={{ color: '#6d7382', fontSize: 10 }}>{new Date(f.created_at).toLocaleDateString()}</Text>
                </View>
              )) : <Text style={{ color: '#6d7382' }}>No followers yet.</Text>}
            </View>
          </ScrollView>
        );

      case 'Payout':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.chartCard}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(168, 85, 247, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Ionicons name="wallet" size={32} color="#a855f7" />
                </View>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>KSh {calculateEarnings().toLocaleString()}</Text>
                <Text style={{ color: '#6d7382', fontSize: 14, marginTop: 4 }}>Estimated Earnings</Text>
              </View>

              <View style={{ backgroundColor: '#121212', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Earnings Breakdown</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#6d7382', fontSize: 13 }}>Growth ({totals.followers} followers)</Text>
                  <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>+ KSh {Math.floor(totals.followers / 10) * 10}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#6d7382', fontSize: 13 }}>Engagement ({totals.likes + totals.comments} interactions)</Text>
                  <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>+ KSh {Math.floor((totals.likes + totals.comments) / 50) * 5}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => alert('Redirecting to M-Pesa settings...')}>
                <Text style={styles.primaryBtnText}>Withdraw to M-Pesa</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <TouchableOpacity style={styles.datePicker} onPress={() => setShowFilterMenu(true)}>
          <Text style={styles.dateText}>{filter.label}</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabBtn}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 0 }}>
        {renderContent()}
      </View>

      <Modal visible={showFilterMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterMenu(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Timeframe</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.value} style={[styles.modalItem, filter.value === f.value && { backgroundColor: '#2a1b3d' }]} onPress={() => { setFilter(f); setShowFilterMenu(false); }}>
                <Text style={[styles.modalItemText, filter.value === f.value && { color: '#a855f7', fontWeight: '700' }]}>{f.label}</Text>
                {filter.value === f.value && <Ionicons name="checkmark" size={20} color="#a855f7" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1f1f1f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dateText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', marginBottom: 20, marginTop: 10 },
  tabBtn: { marginRight: 24, paddingBottom: 10, position: 'relative' },
  tabText: { color: '#6d7382', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#a855f7' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#a855f7' },

  statsScroll: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { width: 130, backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'flex-start' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, marginTop: 12 },
  statLabel: { color: '#6d7382', fontSize: 12 },

  chartCard: { marginHorizontal: 20, backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 24 },
  chartTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  chartSub: { color: '#6d7382', fontSize: 12 },

  sectionHeader: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16, marginTop: 10 },
  postCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 24 },
  postImagePlaceholder: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  postContent: { color: '#fff', fontSize: 14, fontWeight: '600' },

  followerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f' },

  badge: { backgroundColor: 'rgba(168, 85, 247, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },
  primaryBtn: { backgroundColor: '#a855f7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 20, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#121212', borderRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  modalItemText: { color: '#fff', fontSize: 15 },
});
