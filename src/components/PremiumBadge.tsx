import React from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PremiumAvatarProps {
  avatarUrl: string | null;
  fullName: string;
  tier: 'free' | 'premium' | 'elite';
  size?: number;
}

export function PremiumAvatar({ avatarUrl, fullName, tier, size = 40 }: PremiumAvatarProps) {
  const isPremium = tier === 'premium' || tier === 'elite';
  const isElite = tier === 'elite';
  const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fullName || 'User'}`;
  const ringThickness = isPremium ? 4 : 1.5;
  const innerSize = size - (ringThickness * 2);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {isPremium ? (
        <LinearGradient
          colors={isElite ? ['#FFF59D', '#FFD700', '#B8860B', '#FFD700'] : ['#FFDF00', '#D4AF37', '#996515', '#D4AF37']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Image source={{ uri: avatarUrl || fallbackUrl }} style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2, borderWidth: 2, borderColor: '#000' }} />
        </LinearGradient>
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ringThickness, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          <Image source={{ uri: avatarUrl || fallbackUrl }} style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }} />
        </View>
      )}
    </View>
  );
}

export function PremiumDiamond({ tier }: { tier: 'free' | 'premium' | 'elite' }) {
  if (tier !== 'premium' && tier !== 'elite') return null;
  const isElite = tier === 'elite';
  return (
    <View style={{ marginLeft: 6 }}>
      <Ionicons name="diamond" size={18} color={isElite ? '#FFDF00' : '#D4AF37'} />
    </View>
  );
}
