// @ts-nocheck
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import Splash from '../components/Splash';
import Layout from '../components/Layout';
import TermsGate from '../components/TermsGate';

// Auth
import LoginScreen from '../screens/LoginScreen';
import UniversityPickerScreen from '../screens/UniversityPickerScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Status Screens
import PendingScreen from '../screens/PendingScreen';
import RejectedScreen from '../screens/RejectedScreen';
import AppealScreen from '../screens/AppealScreen';

// Main App
import FeedScreen from '../screens/FeedScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationListScreen from '../screens/NotificationListScreen';
import GroupsScreen from '../screens/GroupsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import SearchScreen from '../screens/SearchScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import AccountsCenterScreen from '../screens/AccountsCenterScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import ProfessionalModeScreen from '../screens/ProfessionalModeScreen';
import ProfessionalDashboardScreen from '../screens/ProfessionalDashboardScreen';
import FriendsScreen from '../screens/FriendsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ConversationScreen from '../screens/ConversationScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import SavedScreen from '../screens/SavedScreen';
import GetVerifiedScreen from '../screens/GetVerifiedScreen';
import GetBoostedScreen from '../screens/GetBoostedScreen';
import VideoScreen from '../screens/VideoScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import SessionLockScreen from '../screens/SessionLockScreen';
import HallOfFameScreen from '../screens/HallOfFameScreen';
import MenuScreen from '../screens/MenuScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MarketplaceItemScreen from '../screens/MarketplaceItemScreen';

const Stack = createNativeStackNavigator();

const withLayout = (Component) => (props) => (
  <Layout>
    <Component {...props} />
  </Layout>
);

export default function AppNavigator() {
  const { user, profile, loading, reloadProfile , kickoutReason } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  if (kickoutReason) return <SessionLockScreen />;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }

  const needsTerms = !!profile && !profile.terms_accepted_at && profile.approval_status === 'approved';
  if (needsTerms) return <TermsGate />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="UniversityPicker" component={UniversityPickerScreen} options={{ presentation: 'modal' }} />
          </>
        ) : profile?.approval_status === 'banned' || profile?.approval_status === 'high_ban' || profile?.approval_status === 'rejected' ? (
          <Stack.Screen name="Appeal" component={AppealScreen} />
        ) : profile?.approval_status === 'pending' ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (
          <>
            <Stack.Screen name="Feed" component={withLayout(FeedScreen)} />
            <Stack.Screen name="HallOfFame" component={HallOfFameScreen} />
            <Stack.Screen name="Search" component={withLayout(SearchScreen)} />
            <Stack.Screen name="Connections" component={withLayout(ConnectionsScreen)} />
            <Stack.Screen name="Messages" component={withLayout(MessagesScreen)} />
            <Stack.Screen name="Groups" component={withLayout(GroupsScreen)} />
            <Stack.Screen name="Notifications" component={withLayout(NotificationsScreen)} />
            <Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />
            <Stack.Screen name="AIAssistant" component={withLayout(AIAssistantScreen)} />
            <Stack.Screen name="AccountsCenter" component={withLayout(AccountsCenterScreen)} />
            <Stack.Screen name="Preferences" component={withLayout(PreferencesScreen)} />
            <Stack.Screen name="ProfessionalMode" component={withLayout(ProfessionalModeScreen)} />
            <Stack.Screen name="ProfessionalDashboard" component={withLayout(ProfessionalDashboardScreen)} />
            <Stack.Screen name="Friends" component={withLayout(FriendsScreen)} />
            <Stack.Screen name="PostDetail" component={withLayout(PostDetailScreen)} />
            <Stack.Screen name="Events" component={withLayout(EventsScreen)} />
            <Stack.Screen name="EventDetail" component={withLayout(EventDetailScreen)} />
            <Stack.Screen name="Announcements" component={withLayout(AnnouncementsScreen)} />
            <Stack.Screen name="Saved" component={withLayout(SavedScreen)} />
            <Stack.Screen name="GetVerified" component={withLayout(GetVerifiedScreen)} />
            <Stack.Screen name="GetBoosted" component={withLayout(GetBoostedScreen)} />
            <Stack.Screen name="Video" component={withLayout(VideoScreen)} />
            <Stack.Screen name="Profile" component={withLayout(ProfileScreen)} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="Menu" component={withLayout(MenuScreen)} />
            <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
            <Stack.Screen name="MarketplaceItem" component={MarketplaceItemScreen} />
            <Stack.Screen name="UniversityPicker" component={UniversityPickerScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="NotificationList" component={NotificationListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});
