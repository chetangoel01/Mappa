import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  type?: 'switch' | 'link';
  onPress?: () => void;
}

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Handle logout logic here
            console.log('User logged out');
          },
        },
      ]
    );
  };

  const SettingItem: React.FC<SettingItemProps> = ({ icon, title, value, onValueChange, type = 'switch', onPress }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={type === 'link' ? onPress : undefined}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" style={styles.icon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#007AFF' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={24} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingItem
          icon="notifications-outline"
          title="Notifications"
          value={notifications}
          onValueChange={setNotifications}
        />
        <SettingItem
          icon="moon-outline"
          title="Dark Mode"
          value={darkMode}
          onValueChange={setDarkMode}
        />
        <SettingItem
          icon="location-outline"
          title="Location Services"
          value={locationServices}
          onValueChange={setLocationServices}
        />
        <SettingItem
          icon="sync-outline"
          title="Data Sync"
          value={dataSync}
          onValueChange={setDataSync}
        />
        <SettingItem
          icon="volume-high-outline"
          title="Sound Effects"
          value={soundEffects}
          onValueChange={setSoundEffects}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingItem
          icon="person-outline"
          title="Edit Profile"
          type="link"
          onPress={() => console.log('Edit profile')}
        />
        <SettingItem
          icon="lock-closed-outline"
          title="Privacy Settings"
          type="link"
          onPress={() => console.log('Privacy settings')}
        />
        <SettingItem
          icon="shield-outline"
          title="Security"
          type="link"
          onPress={() => console.log('Security settings')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem
          icon="help-circle-outline"
          title="Help Center"
          type="link"
          onPress={() => console.log('Help center')}
        />
        <SettingItem
          icon="information-circle-outline"
          title="About"
          type="link"
          onPress={() => console.log('About')}
        />
        <SettingItem
          icon="document-text-outline"
          title="Terms of Service"
          type="link"
          onPress={() => console.log('Terms of service')}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 