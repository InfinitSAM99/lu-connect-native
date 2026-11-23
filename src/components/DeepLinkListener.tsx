import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function DeepLinkListener() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();

  useEffect(() => {
    // Handle links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleLink(url);
    });

    // Handle link when app is opened from killed state
    Linking.getInitialURL().then((url) => {
      if (url) handleLink(url);
    });

    return () => subscription.remove();
  }, [profile]); // Depend on profile so we have access to the current user

  const handleLink = async (url: string) => {
    console.log('Deep Link received:', url);

    // 1. Handle Tunnel Links
    const tunnelMatch = url.match(/join-tunnel\/([A-Z0-9]+)/i);
    if (tunnelMatch && tunnelMatch[1]) {
      const code = tunnelMatch[1].toUpperCase();
      navigation.navigate('Tunnels', { prefilledCode: code });
      return;
    }

    // 2. Handle Profile QR Code Links
    // Matches: luconnectnative://profile/USER_ID or exp://.../--/profile/USER_ID
    const profileMatch = url.match(/profile\/([a-zA-Z0-9-]+)/i);
    if (profileMatch && profileMatch[1]) {
      const targetUserId = profileMatch[1];
      
      if (!profile?.id) {
        // If not logged in, just go to the profile
        navigation.navigate('Profile', { id: targetUserId });
        return;
      }

      if (targetUserId === profile.id) {
        Toast.show({ type: 'info', text1: 'Your QR Code', text2: 'You scanned your own code!' });
        navigation.navigate('Profile');
        return;
      }

      // Auto-Follow logic
      try {
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', profile.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (!existingFollow) {
          await supabase.from('follows').insert({ 
            follower_id: profile.id, 
            following_id: targetUserId 
          });
          Toast.show({ type: 'success', text1: 'Following!', text2: 'You are now following this user.' });
        }
      } catch (e) {
        console.error('Auto-follow failed', e);
      }

      // Navigate to their profile
      navigation.navigate('Profile', { id: targetUserId });
    }
  };

  return null;
}
