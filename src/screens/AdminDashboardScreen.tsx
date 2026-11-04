import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_COLORS = {
  nudity: '#ec4899',
  hate: '#dc2626',
  harassment: '#f97316',
  spam: '#eab308',
  self_harm: '#8b5cf6',
  violence: '#b91c1c',
  other: '#6b7280',
  none: '#6b7280',
};

export default function AdminDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    onlineNow: 0,
    totalUsers: 0,
    totalPosts: 0,
    totalReports: 0,
    totalComments: 0,
    activeToday: 0,
  });

  const [signupsData, setSignupsData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [postsData, setPostsData] = useState<any[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [activeUsersData, setActiveUsersData] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [flagsByCategory, setFlagsByCategory] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        countsRes,
        allSignups, 
        allActivity,
        allPosts,
        allComments,
        allReports,
        allFlags
      ] = await Promise.all([
        supabase.rpc('admin_counts'),
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('profiles').select('last_seen').gte('last_seen', thirtyDaysAgo),
        supabase.from('posts').select('created_at').eq('is_deleted', false).gte('created_at', thirtyDaysAgo),
        supabase.from('comments').select('created_at').eq('is_deleted', false).gte('created_at', thirtyDaysAgo),
        supabase.from('reports').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('moderation_flags').select('ai_category').gte('created_at', thirtyDaysAgo),
      ]);

      const counts = countsRes?.data || {};
      setStats({
        onlineNow: counts.online_now || 0,
        totalUsers: counts.users || 0,
        totalPosts: counts.posts || 0,
        totalReports: counts.reports || 0,
        totalComments: counts.comments || 0,
        activeToday: counts.active_today || 0,
      });

      // Helper for 30-day buckets
      const buildDayBuckets = (sourceData: any[] | null) => {
        const days = [];
        const map: any = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
          map[key] = days[days.length - 1];
        }
        (sourceData || []).forEach((row) => {
          const key = row.created_at?.slice(0, 10);
          if (key && map[key]) map[key].count += 1;
        });
        return days;
      };

      setSignupsData(buildDayBuckets(allSignups.data));
      setPostsData(buildDayBuckets(allPosts.data));
      setCommentsData(buildDayBuckets(allComments.data));
      setReportsData(buildDayBuckets(allReports.data));

      // Active Users 30 days
      const activeDays = [];
      const activeMap: any = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        activeDays.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
        activeMap[key] = activeDays[activeDays.length - 1];
      }
      (allActivity.data || []).forEach((row) => {
        if (!row.last_seen) return;
        const key = row.last_seen.slice(0, 10);
        if (activeMap[key]) activeMap[key].count += 1;
      });
      setActiveUsersData(activeDays);

      // 24h Activity
      const hourBuckets = [];
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        hourBuckets.push({ label: `${d.getHours().toString().padStart(2, '0')}:00`, count: 0 });
      }
      (allActivity.data || []).forEach((row) => {
        if (!row.last_seen) return;
        const seen = new Date(row.last_seen);
        if (seen.getTime() < now.getTime() - 24 * 60 * 60 * 1000) return;
        const h = seen.getHours();
        const bucket = hourBuckets.find((b, i) => parseInt(b.label.split(':')[0]) === h);
        if (bucket) bucket.count += 1;
      });
      setHourlyData(hourBuckets);

      // Flags by Category
      const catMap: any = {};
      (allFlags.data || []).forEach((f) => {
        const cat = f.ai_category || 'other';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const catList = Object.entries(catMap)
        .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] || '#6b7280' }))
        .filter((c: any) => c.value > 0);
      setFlagsByCategory(catList);

    } catch (e: any) {
      console.log('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ color: '#6d7382', marginTop: 16 }}>Loading dashboard...</Text>
      </View>
    );
  }

  const renderChart = (data: any[], color: string) => {
    const max = Math.max(...data.map(d => d.count), 5);
    return (
      <View style={styles.chartWrap}>
        {data.map((d, i) => {
          const height = (d.count / max) * 100;
          return (
            <View key={i} style={styles.chartBarContainer}>
              <View style={[styles.chartBar, { height: `${Math.max(height, 2)}%`, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.headerTitle}>DASHBOARD</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* BIG TOTALS */}
        <View style={styles.totalsGrid}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{stats.totalUsers}</Text>
            <Text style={styles.totalLabel}>Total Users</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{stats.totalPosts}</Text>
            <Text style={styles.totalLabel}>Total Posts</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{stats.totalReports}</Text>
            <Text style={styles.totalLabel}>Reports</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{stats.totalComments}</Text>
            <Text style={styles.totalLabel}>Comments</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* LIVE ROW */}
        <View style={styles.liveRow}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.liveBigValue}>{stats.onlineNow}</Text>
            <Text style={styles.liveLabelText}>online now</Text>
          </View>
          <View style={{ width: 1, height: 40, backgroundColor: '#1f1f1f' }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.liveBigValue}>{stats.activeToday}</Text>
            <Text style={styles.liveLabelText}>active today</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* CHART 1: SIGNUPS */}
        <Text style={styles.chartTitle}>NEW SIGNUPS · LAST 30 DAYS</Text>
        {renderChart(signupsData, '#ef4444')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>30 days ago</Text>
          <Text style={styles.chartAxisText}>Today</Text>
        </View>

        {/* CHART 2: ACTIVITY 24H */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>ACTIVITY · LAST 24 HOURS</Text>
        {renderChart(hourlyData, '#ef4444')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>24h ago</Text>
          <Text style={styles.chartAxisText}>Now</Text>
        </View>

        {/* CHART 3: POSTS */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>POSTS · LAST 30 DAYS</Text>
        {renderChart(postsData, '#3b82f6')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>30 days ago</Text>
          <Text style={styles.chartAxisText}>Today</Text>
        </View>

        {/* CHART 4: COMMENTS */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>COMMENTS · LAST 30 DAYS</Text>
        {renderChart(commentsData, '#22c55e')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>30 days ago</Text>
          <Text style={styles.chartAxisText}>Today</Text>
        </View>

        {/* CHART 5: ACTIVE USERS */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>ACTIVE USERS · LAST 30 DAYS</Text>
        {renderChart(activeUsersData, '#a855f7')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>30 days ago</Text>
          <Text style={styles.chartAxisText}>Today</Text>
        </View>

        {/* CHART 6: REPORTS */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>REPORTS · LAST 30 DAYS</Text>
        {renderChart(reportsData, '#f59e0b')}
        <View style={styles.chartXLabels}>
          <Text style={styles.chartAxisText}>30 days ago</Text>
          <Text style={styles.chartAxisText}>Today</Text>
        </View>

        {/* FLAGS BY CATEGORY */}
        <Text style={[styles.chartTitle, { marginTop: 30 }]}>FLAGS BY CATEGORY · LAST 30 DAYS</Text>
        <View style={styles.flagsWrap}>
          {flagsByCategory.length === 0 ? (
            <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>No flags in the last 30 days.</Text>
          ) : (
            flagsByCategory.map((f, i) => (
              <View key={i} style={styles.flagRow}>
                <View style={[styles.flagDot, { backgroundColor: f.color }]} />
                <Text style={styles.flagName}>{f.name}</Text>
                <Text style={styles.flagValue}>{f.value}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { color: '#22c55e', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 16 },
  totalItem: { width: '45%', marginBottom: 10 },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  totalLabel: { color: '#6d7382', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16, marginVertical: 16 },

  liveRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  liveBigValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  liveLabelText: { color: '#6d7382', fontSize: 12, marginTop: 4 },

  chartTitle: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 16, marginBottom: 12 },
  chartWrap: { flexDirection: 'row', alignItems: 'flex-end', height: 120, paddingHorizontal: 16, gap: 2 },
  chartBarContainer: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 2 },
  chartXLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 8 },
  chartAxisText: { color: '#1f1f1f', fontSize: 10, fontWeight: '600' },

  flagsWrap: { paddingHorizontal: 16 },
  flagRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0a0a0a' },
  flagDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  flagName: { color: '#fff', flex: 1, fontSize: 14, textTransform: 'capitalize' },
  flagValue: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
