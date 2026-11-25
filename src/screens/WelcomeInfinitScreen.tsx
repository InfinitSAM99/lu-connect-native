import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';

export default function WelcomeInfinitScreen({ navigation }: any) {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // After 3 seconds, move to the Feed automatically
    const timer = setTimeout(() => {
      navigation.replace('Feed');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>WELCOME TO</Text>
        <Text style={styles.luText}>LU CONNECT</Text>

        <Animated.View style={[styles.logoWrap, { opacity: fadeAnim }]}>
          <Image 
            source={require('../../assets/images/infinit_logo.png')} 
            style={{ width: 200, height: 80, resizeMode: 'contain' }} 
          />
        </Animated.View>

        <Text style={styles.thanksText}>Thanks for making an Infinit Co account.</Text>
        <Text style={styles.subText}>Your campus is waiting.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 24 },
  welcomeText: { color: '#6d7382', fontSize: 14, letterSpacing: 4, marginBottom: 10, fontWeight: '600' },
  luText: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1, marginBottom: 60 },
  logoWrap: { marginBottom: 60 },
  thanksText: { color: '#aab0bd', fontSize: 16, textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  subText: { color: '#6d7382', fontSize: 14, textAlign: 'center' },
});
