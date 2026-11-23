// @ts-nocheck
import React, { useState, useEffect } from 'react';
import * as Application from 'expo-application';
import { supabase } from '../lib/supabase';
import ForceUpdateScreen from '../screens/ForceUpdateScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import { useAuth } from '../context/AuthContext';

// Core Components
import Splash from '../components/Splash';
import Layout from '../components/Layout';
import DeepLinkListener from '../components/DeepLinkListener';

// Auth & Status Screens
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CheckAccountIdScreen from '../screens/CheckAccountIdScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import UniversityPickerScreen from '../screens/UniversityPickerScreen';
import PendingScreen from '../screens/PendingScreen';
import RejectedScreen from '../screens/RejectedScreen';
import AppealScreen from '../screens/AppealScreen';
import ProfileEnforcerScreen from '../screens/ProfileEnforcerScreen';
import FacultyPickerScreen from '../screens/FacultyPickerScreen';
import AcademicLevelPickerScreen from '../screens/AcademicLevelPickerScreen';
import SessionLockScreen from '../screens/SessionLockScreen';
import AccountIdRecoveryScreen from '../screens/AccountIdRecoveryScreen';
import ContactAdminScreen from '../screens/ContactAdminScreen';

// Student Screens
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ConversationScreen from '../screens/ConversationScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import StoryComposerScreen from '../screens/StoryComposerScreen';
import ChatInfoScreen from '../screens/ChatInfoScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationListScreen from '../screens/NotificationListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AudioCallScreen from '../screens/AudioCallScreen';
import SecurityScreen from '../screens/SecurityScreen';
import LoginActivityScreen from '../screens/LoginActivityScreen';
import AppIconScreen from '../screens/AppIconScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import BiometricSettingsScreen from '../screens/BiometricSettingsScreen';
import SetPatternScreen from '../screens/SetPatternScreen';
import SecurityQuestionsScreen from '../screens/SecurityQuestionsScreen';

import MenuScreen from '../screens/MenuScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import FriendsScreen from '../screens/FriendsScreen';
import SavedScreen from '../screens/SavedScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MarketplaceItemScreen from '../screens/MarketplaceItemScreen';
import HallOfFameScreen from '../screens/HallOfFameScreen';
import TunnelsScreen from '../screens/TunnelsScreen';
import TunnelFeedScreen from '../screens/TunnelFeedScreen';
import TunnelModerationScreen from '../screens/TunnelModerationScreen';
import VideoScreen from '../screens/VideoScreen';
import UploadReelScreen from '../screens/UploadReelScreen';
import GetVerifiedScreen from '../screens/GetVerifiedScreen';
import GetBoostedScreen from '../screens/GetBoostedScreen';
import AccountsCenterScreen from '../screens/AccountsCenterScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import ProfessionalModeScreen from '../screens/ProfessionalModeScreen';
import ProfessionalDashboardScreen from '../screens/ProfessionalDashboardScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ReplyThreadScreen from '../screens/ReplyThreadScreen';

// Academic Hub
import AcademicHubScreen from '../screens/AcademicHubScreen';
import AcademicViewerScreen from '../screens/AcademicViewerScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminStudentsScreen from '../screens/AdminStudentsScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';
import AdminPaymentsScreen from '../screens/AdminPaymentsScreen';
import AdminPendingApprovalsScreen from '../screens/AdminPendingApprovalsScreen';
import AdminMessagesScreen from '../screens/AdminMessagesScreen';
import AdminEventsScreen from '../screens/AdminEventsScreen';
import AdminGroupsScreen from '../screens/AdminGroupsScreen';
import AdminAnnouncementsScreen from '../screens/AdminAnnouncementsScreen';
import AdminModerationScreen from '../screens/AdminModerationScreen';
import AdminModerationDetailScreen from '../screens/AdminModerationDetailScreen';
import AdminSecurityScreen from '../screens/AdminSecurityScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminMenuScreen from '../screens/AdminMenuScreen';
import AppUpdaterScreen from '../screens/AppUpdaterScreen';
import AdminPlaceholderScreen from '../screens/AdminPlaceholderScreen';

import ThemeCustomizerScreen from '../screens/ThemeCustomizerScreen';

const Stack = createNativeStackNavigator();

const withLayout = (Component) => (props) => (
  <Layout>
    <Component {...props} />
  </Layout>
);

export default function AppNavigator() {
  const { user, profile, loading, kickoutReason, deviceBanned } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  
  // Update State
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ url: '', version: '' });

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (data && data.apk_url) {
          const currentVersion = Application.nativeApplicationVersion || '1.0.0';
          // If the DB version is different from the app version, force update
          if (currentVersion !== data.latest_version) {
            setNeedsUpdate(true);
            setUpdateInfo({ url: data.apk_url, version: data.latest_version });
          }
        }
      } catch (e) {
        console.error('Version check failed:', e);
      }
    };
    checkVersion();
  }, []);

  // Safety timeout: If loading takes more than 2.5 seconds, force it to open
  useEffect(() => {
    const timer = setTimeout(() => setForceLoad(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  if (loading && !forceLoad) {
    // Instead of showing a spinner, just return null for 2 seconds while loading
    return <View style={styles.center}><ActivityIndicator color="#ef4444" size="large" /></View>;
  }

  // Catch the state where the user is logged in but the profile hasn't downloaded from Supabase yet
  if (user && !profile?.id && !forceLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }

  // 1. Device Banned Stack
  if (deviceBanned) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="DeviceBanned" component={require('../screens/DeviceBannedScreen').default} />
          <Stack.Screen name="ContactAdmin" component={ContactAdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 2. Session Locked Stack
  if (kickoutReason) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SessionLock" component={SessionLockScreen} />
          <Stack.Screen name="AccountIdRecovery" component={AccountIdRecoveryScreen} />
          <Stack.Screen name="ContactAdmin" component={ContactAdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // FORCE UPDATE CHECK
  if (needsUpdate) {
    return <ForceUpdateScreen apkUrl={updateInfo.url} version={updateInfo.version} />;
  }

  // 3. Main Navigation
  return (
    <NavigationContainer ref={navigationRef}>
      <DeepLinkListener />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // --- LOGGED OUT ---
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="CheckAccountId" component={CheckAccountIdScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="UniversityPicker" component={UniversityPickerScreen} options={{ presentation: 'modal' }} />
          </>
        ) : profile?.approval_status === 'banned' || profile?.approval_status === 'high_ban' || profile?.approval_status === 'rejected' ? (
          // --- BANNED / REJECTED ---
          <Stack.Screen name="Appeal" component={AppealScreen} />
        ) : profile?.approval_status === 'pending' ? (
          // --- PENDING APPROVAL ---
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (profile?.id && (!profile.university_id || !profile.avatar_url || !profile.faculty || !profile.course || !profile.year_of_study)) ? (
          // --- ENFORCER (MISSING DETAILS) ---
          <>
            <Stack.Screen 
              name="ProfileEnforcer" 
              component={ProfileEnforcerScreen} 
              options={{ gestureEnabled: false, headerShown: false }} 
            />
            <Stack.Screen name="FacultyPicker" component={FacultyPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AcademicLevelPicker" component={AcademicLevelPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="UniversityPicker" component={UniversityPickerScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          // --- LOGGED IN & APPROVED ---
          <>
            {/* Student Core */}
            <Stack.Screen name="Feed" component={withLayout(FeedScreen)} />
            <Stack.Screen name="Search" component={withLayout(SearchScreen)} />
            <Stack.Screen name="Messages" component={withLayout(MessagesScreen)} />
            <Stack.Screen name="Notifications" component={withLayout(NotificationsScreen)} />
            <Stack.Screen name="Profile" component={withLayout(ProfileScreen)} />
            <Stack.Screen name="Menu" component={withLayout(MenuScreen)} />
            
            {/* Student Features */}
            <Stack.Screen name="Connections" component={withLayout(ConnectionsScreen)} />
            <Stack.Screen name="Friends" component={withLayout(FriendsScreen)} />
            <Stack.Screen name="Saved" component={withLayout(SavedScreen)} />
            <Stack.Screen name="AIAssistant" component={withLayout(AIAssistantScreen)} />
            <Stack.Screen name="Events" component={withLayout(EventsScreen)} />
            <Stack.Screen name="Groups" component={withLayout(GroupsScreen)} />
            <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
            <Stack.Screen name="HallOfFame" component={HallOfFameScreen} />
            <Stack.Screen name="Tunnels" component={TunnelsScreen} />
            <Stack.Screen name="Video" component={withLayout(VideoScreen)} />
            <Stack.Screen name="UploadReel" component={withLayout(UploadReelScreen)} />
            <Stack.Screen name="Announcements" component={withLayout(AnnouncementsScreen)} />
            <Stack.Screen name="AcademicHub" component={withLayout(AcademicHubScreen)} />
            <Stack.Screen name="AcademicViewer" component={AcademicViewerScreen} />
            
            {/* Settings & Details */}
            <Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />
            <Stack.Screen name="Security" component={withLayout(SecurityScreen)} />
            <Stack.Screen name="AudioCallScreen" component={AudioCallScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="LoginActivity" component={LoginActivityScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="PaymentMethodsScreen" component={PaymentMethodsScreen} />
            <Stack.Screen name="AppIconScreen" component={AppIconScreen} />
            <Stack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <Stack.Screen name="BiometricSettingsScreen" component={BiometricSettingsScreen} />
            <Stack.Screen name="CheckAccountId" component={CheckAccountIdScreen} />
            <Stack.Screen name="SetPattern" component={SetPatternScreen} />
            <Stack.Screen name="SecurityQuestions" component={SecurityQuestionsScreen} />
            <Stack.Screen name="AccountIdRecovery" component={AccountIdRecoveryScreen} />
            <Stack.Screen name="SessionLock" component={SessionLockScreen} />

            <Stack.Screen name="AccountsCenter" component={withLayout(AccountsCenterScreen)} />
            <Stack.Screen name="Preferences" component={withLayout(PreferencesScreen)} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="ProfessionalMode" component={withLayout(ProfessionalModeScreen)} />
            <Stack.Screen name="ProfessionalDashboard" component={withLayout(ProfessionalDashboardScreen)} />
            <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="GetVerified" component={withLayout(GetVerifiedScreen)} />
            <Stack.Screen name="GetBoosted" component={withLayout(GetBoostedScreen)} />

            {/* Modals & Sub-screens */}
            <Stack.Screen name="UniversityPicker" component={UniversityPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="FacultyPicker" component={FacultyPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AcademicLevelPicker" component={AcademicLevelPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="NotificationList" component={NotificationListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="ChatInfoScreen" component={ChatInfoScreen} />
            <Stack.Screen name="ThemeCustomizerScreen" component={ThemeCustomizerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="MarketplaceItem" component={MarketplaceItemScreen} />
            <Stack.Screen name="TunnelFeed" component={TunnelFeedScreen} />
            <Stack.Screen name="TunnelModeration" component={TunnelModerationScreen} />
            <Stack.Screen name="PostDetail" component={withLayout(PostDetailScreen)} />
            <Stack.Screen name="ReplyThreadScreen" component={ReplyThreadScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_right' }} />

            {/* Admin Screens */}
            <Stack.Screen name="AdminDashboard" component={withLayout(AdminDashboardScreen)} />
            <Stack.Screen name="AdminMenu" component={withLayout(AdminMenuScreen)} />
            <Stack.Screen name="AdminStudents" component={withLayout(AdminStudentsScreen)} />
            <Stack.Screen name="AdminReports" component={withLayout(AdminReportsScreen)} />
            <Stack.Screen name="AdminPayments" component={withLayout(AdminPaymentsScreen)} />
            <Stack.Screen name="AdminPending" component={withLayout(AdminPendingApprovalsScreen)} />
            <Stack.Screen name="AdminMessages" component={withLayout(AdminMessagesScreen)} />
            <Stack.Screen name="AdminEvents" component={withLayout(AdminEventsScreen)} />
            <Stack.Screen name="AdminGroups" component={withLayout(AdminGroupsScreen)} />
            <Stack.Screen name="AdminAnnouncements" component={withLayout(AdminAnnouncementsScreen)} />
            <Stack.Screen name="AdminModeration" component={withLayout(AdminModerationScreen)} />
            <Stack.Screen name="AdminModerationDetail" component={AdminModerationDetailScreen} />
            <Stack.Screen name="AdminSecurity" component={withLayout(AdminSecurityScreen)} />
            <Stack.Screen name="AdminSettings" component={withLayout(AdminSettingsScreen)} />
            <Stack.Screen name="AppUpdater" component={withLayout(AppUpdaterScreen)} />
            
            {/* Placeholder for unfinished admin routes */}
            <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: "fullScreenModal", headerShown: false }} />
            <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: "fullScreenModal", headerShown: false }} />
            <Stack.Screen name="StoryComposer" component={StoryComposerScreen} options={{ presentation: "fullScreenModal", headerShown: false }} />
            <Stack.Screen name="AdminPosts" component={withLayout(AdminPlaceholderScreen)} />
            <Stack.Screen name="AdminComments" component={withLayout(AdminPlaceholderScreen)} />
            <Stack.Screen name="AdminAdmins" component={withLayout(AdminPlaceholderScreen)} />
            <Stack.Screen name="AdminAuditLogs" component={withLayout(AdminPlaceholderScreen)} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});
