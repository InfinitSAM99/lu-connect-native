import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';

const STICKERS = ['😀','😂','🥰','😍','😎','🤩','😭','😅','😊','🙃','😇','🤔','😴','🤗','😘','🥳','👍','👎','👏','🙌','🤝','💪','🙏','✌️','❤️','💔','💯','🔥','⭐','✨','🎉','🎊','🍕','🍔','☕','🍺','⚽','🏀','🎮','🎵','🐶','🐱','🌹','🌈','☀️','🌙','⚡','💧'];

export default function StickersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Stickers" showBack={true} onBack={() => navigation.goBack()} />
      <FlatList
        data={STICKERS}
        keyExtractor={(item) => item}
        numColumns={5}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', margin: 8, backgroundColor: '#141414', borderRadius: 16 }} 
            onPress={() => { /* Logic to send sticker if opened from chat */ navigation.goBack(); }}
          >
            <Text style={{ fontSize: 40 }}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
