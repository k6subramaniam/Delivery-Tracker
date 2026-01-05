import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../src/services/api';
import { DriverLocation } from '../../src/types';
import { format } from 'date-fns';

export default function MapScreen() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLocations = async () => {
    try {
      const response = await driversAPI.getLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  }, []);

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Tracking</Text>
        <View style={styles.driverCount}>
          <Ionicons name="car" size={16} color="#3B82F6" />
          <Text style={styles.driverCountText}>{locations.length} active</Text>
        </View>
      </View>

      {locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No driver locations</Text>
          <Text style={styles.emptySubtitle}>
            Drivers will appear here when they share their location
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Map Visual Representation */}
          <View style={styles.mapVisual}>
            <View style={styles.mapBackground}>
              {/* Grid lines for visual effect */}
              <View style={styles.gridOverlay}>
                {[...Array(5)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${i * 25}%` }]} />
                ))}
                {[...Array(5)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${i * 25}%` }]} />
                ))}
              </View>
              
              {/* Driver markers positioned randomly for visual */}
              {locations.map((loc, index) => {
                // Create pseudo-random positions based on coordinates
                const xPercent = ((Math.abs(loc.longitude) % 90) / 90) * 80 + 10;
                const yPercent = ((Math.abs(loc.latitude) % 90) / 90) * 80 + 10;
                return (
                  <TouchableOpacity
                    key={loc.driver_id}
                    style={[styles.mapMarker, { left: `${xPercent}%`, top: `${yPercent}%` }]}
                    onPress={() => openInMaps(loc.latitude, loc.longitude, loc.driver_name)}
                  >
                    <View style={styles.markerPulse} />
                    <View style={styles.markerDot}>
                      <Ionicons name="car" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.markerLabel}>{loc.driver_name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.mapHint}>Tap a driver to open in Google Maps</Text>
          </View>

          {/* Driver List */}
          <Text style={styles.listTitle}>Active Drivers</Text>
          {locations.map((location) => (
            <TouchableOpacity
              key={location.driver_id}
              style={styles.driverCard}
              onPress={() => openInMaps(location.latitude, location.longitude, location.driver_name)}
            >
              <View style={styles.driverIcon}>
                <Ionicons name="person" size={20} color="#3B82F6" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{location.driver_name}</Text>
                <Text style={styles.driverTime}>
                  Updated {format(new Date(location.timestamp), 'MMM d, h:mm a')}
                </Text>
                <View style={styles.coordsRow}>
                  <Ionicons name="location" size={12} color="#6B7280" />
                  <Text style={styles.coordinates}>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButton}>
                <Ionicons name="navigate" size={18} color="#3B82F6" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  driverCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  driverCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mapVisual: {
    marginBottom: 24,
  },
  mapBackground: {
    height: 280,
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#BAE6FD',
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    opacity: 0.2,
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mapHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  driverTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  coordinates: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
