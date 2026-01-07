import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { locationAPI, adminAPI } from '../../src/services/api';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const router = useRouter();
  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('disabled');

  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Auto-start location updates if driver
  useEffect(() => {
    if (isDriver && locationEnabled) {
      startLocationUpdates();
      const interval = setInterval(startLocationUpdates, 15000); // Update every 15s
      return () => clearInterval(interval);
    }
  }, [isDriver, locationEnabled]);

  const resetAllData = async () => {
    const performReset = async () => {
      try {
        await adminAPI.resetData();
        if (Platform.OS === 'web') {
          window.alert('All data has been reset.');
        } else {
          Alert.alert('Success', 'All data has been reset.');
        }
      } catch (error) {
        const msg = 'Failed to reset data';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm('Are you sure you want to delete ALL data? This cannot be undone.');
      if (confirm) {
        performReset();
      }
    } else {
      Alert.alert(
        'Reset All Data',
        'Are you sure you want to delete ALL data? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Everything',
            style: 'destructive',
            onPress: performReset,
          },
        ]
      );
    }
  };

  const checkLocationPermission = async () => {
    // Default to enabled for drivers to ensure visibility
    if (isDriver) {
      setLocationEnabled(true);
    }
    
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationEnabled(true);
      }
    } catch (e) {
      // Ignore error on web/simulators where expo-location might fail
      console.log('Location permission check failed, defaulting to enabled');
    }
  };

  const toggleLocation = async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share your location');
        return;
      }
      setLocationEnabled(true);
      startLocationUpdates();
    } else {
      setLocationEnabled(false);
      setLocationStatus('disabled');
    }
  };

  const startLocationUpdates = async () => {
    try {
      setLocationStatus('updating...');
      
      // Fallback for simulation if needed
      const mockLat = 37.7749 + (Math.random() - 0.5) * 0.01;
      const mockLng = -122.4194 + (Math.random() - 0.5) * 0.01;

      try {
        const location = await Location.getCurrentPositionAsync({});
        await locationAPI.update({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationStatus('shared');
      } catch (gpsError) {
        console.warn('GPS failed, using fallback/web logic', gpsError);
        
        // Web/Fallback logic
        if (Platform.OS === 'web' && navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
             async (position) => {
               try {
                 await locationAPI.update({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                 });
                 setLocationStatus('shared (web)');
               } catch (e) {
                 setLocationStatus('api error');
               }
             },
             async (err) => {
               console.log("Web geolocation error, using mock", err);
               // Final Fallback: Send mock location so Admin sees something
               await locationAPI.update({
                  latitude: mockLat,
                  longitude: mockLng,
               });
               setLocationStatus('simulated');
             }
           );
        } else {
           // Simulator/No-GPS fallback
           await locationAPI.update({
              latitude: mockLat,
              longitude: mockLng,
           });
           setLocationStatus('simulated');
        }
      }
    } catch (error) {
      console.error('Error updating location:', error);
      setLocationStatus('error');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Are you sure you want to logout?');
      if (confirm) {
        await logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, shadowColor: theme === 'dark' ? '#000' : '#EF6A46' }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name}</Text>
            <Text style={[styles.profileRole, { color: colors.textSecondary }]}>
              {user?.role === 'admin' ? 'Administrator' : 'Delivery Driver'} | {user?.email}
            </Text>
          </View>
        </View>

        {/* Menu Items Card */}
        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' }]}>
              <Ionicons name="person-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Account</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' }]}>
              <Ionicons name="moon-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E5E7EB', true: '#EF6A46' }}
              thumbColor={'#FFFFFF'}
            />
          </View>

          <View style={styles.menuDivider} />

          {isDriver && (
            <>
              <View style={styles.menuItem}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="location-outline" size={20} color="#EF6A46" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuText}>Share Location</Text>
                  <Text style={styles.menuSubtext}>{locationStatus}</Text>
                </View>
                <Switch
                  value={locationEnabled}
                  onValueChange={toggleLocation}
                  trackColor={{ false: '#E5E7EB', true: '#EF6A46' }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              <View style={styles.menuDivider} />
            </>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={() => {
             router.push('/chat/e43cc6bf-1a46-4863-8aae-33c947fe83fc'); // Demo Admin ID from mock_db
          }}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={styles.menuText}>Contact Admin</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={resetAllData}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Reset All Data</Text>
            <Ionicons name="warning-outline" size={20} color="#EF4444" />
          </TouchableOpacity>

          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Creamy bg
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2D2B', // Dark brown
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#EF6A46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF6A46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3E2D2B',
  },
  profileRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 72, // Align with text
  },
  logoutContainer: {
    padding: 20,
    paddingTop: 24,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#EF6A46',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF6A46',
    fontSize: 16,
    fontWeight: '700',
  },
});
