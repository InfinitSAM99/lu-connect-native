import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NAV_ITEMS = [
  { id: 'Feed', icon: 'home-outline' },
  { id: 'Connections', icon: 'people-outline' },
  { id: 'Messages', icon: 'chatbubble-outline' },
  { id: 'Notifications', icon: 'notifications-outline' },
  { id: 'Video', icon: 'play-circle-outline' },
  { id: 'Menu', icon: 'menu-outline' },
];

export default function TopNav() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.navItem} onPress={() => navigation.navigate(item.id)} activeOpacity={0.7}>
            <Ionicons name={item.icon as any} size={22} color="#ffffff" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#000', 
    borderBottomWidth: 1, // Divider is now here
    borderBottomColor: '#1f1f1f',
  },
  scrollContent: { 
    flexGrow: 1,
    paddingHorizontal: 24, 
    paddingVertical: 10, // Reduced padding for a tighter look
    justifyContent: 'space-between', 
    alignItems: 'center'
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
});
