// @ts-nocheck
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageLoader from './components/PageLoader.jsx';
import Splash from './components/Splash.jsx';
import useAndroidBack from './hooks/useAndroidBack.js';

// Core shell — eagerly loaded (needed on first paint)
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Feed from './pages/Feed.jsx';

// Everything else — lazily loaded
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Connections = lazy(() => import('./pages/Connections.jsx'));
const Friends = lazy(() => import('./pages/Friends.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const Conversation = lazy(() => import('./pages/Conversation.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Groups = lazy(() => import('./pages/Groups.jsx'));
const GroupDetail = lazy(() => import('./pages/GroupDetail.jsx'));
const GroupSettings = lazy(() => import('./pages/GroupSettings.jsx'));
const Events = lazy(() => import('./pages/Events.jsx'));
const EventDetail = lazy(() => import('./pages/EventDetail.jsx'));
const Announcements = lazy(() => import('./pages/Announcements.jsx'));
const Saved = lazy(() => import('./pages/Saved.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const AccountsCenter = lazy(() => import('./pages/AccountsCenter.jsx'));
const ProfessionalMode = lazy(() => import('./pages/ProfessionalMode.jsx'));
const Preferences = lazy(() => import('./pages/Preferences.jsx'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard.jsx'));
const GetVerified = lazy(() => import('./pages/GetVerified.jsx'));
const GetBoosted = lazy(() => import('./pages/GetBoosted.jsx'));
const Video = lazy(() => import('./pages/Video.jsx'));
const AIAssistant = lazy(() => import('./pages/AIAssistant.jsx'));
const Pending = lazy(() => import('./pages/Pending.jsx'));
const Rejected = lazy(() => import('./pages/Rejected.jsx'));
const Appeal = lazy(() => import('./pages/Appeal.jsx'));
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));

function Protected({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="state">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.approval_status === 'banned' || profile?.approval_status === 'high_ban') {
    return <Navigate to="/appeal" replace />;
  }
  return children;
}

function AppRoutes() {
  useAndroidBack();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/appeal" element={<Appeal />} />
        <Route path="/pending" element={<Protected><Pending /></Protected>} />
        <Route path="/rejected" element={<Protected><Rejected /></Protected>} />

        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="feed" element={<Feed />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="friends/:userId" element={<Friends />} />
          <Route path="connections" element={<Connections />} />
          <Route path="search" element={<Search />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Conversation />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="groups/:id/settings" element={<GroupSettings />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="saved" element={<Saved />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/accounts" element={<AccountsCenter />} />
          <Route path="settings/professional-mode" element={<ProfessionalMode />} />
          <Route path="settings/preferences" element={<Preferences />} />
          <Route path="settings/professional-dashboard" element={<ProfessionalDashboard />} />
          <Route path="get-verified" element={<GetVerified />} />
          <Route path="get-boosted" element={<GetBoosted />} />
          <Route path="video" element={<Video />} />
          <Route path="ai" element={<AIAssistant />} />
        </Route>

        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <>
      <Splash />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </>
  );
}
