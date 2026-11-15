import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';

export default function DeepLinkListener() {
  const navigation = useNavigation<any>();

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
  }, []);

  const handleLink = (url: string) => {
    console.log('Deep Link received:', url);
    
    // Extract tunnel code from any format:
    // exp://192.168.x.x:8081/--/join-tunnel/CODE
    // luconnectnative://join-tunnel/CODE
    const match = url.match(/join-tunnel\/([A-Z0-9]+)/i);
    
    if (match && match[1]) {
      const code = match[1].toUpperCase();
      console.log('Joining tunnel with code:', code);
      navigation.navigate('Tunnels', { prefilledCode: code });
    }
  };

  return null;
}
