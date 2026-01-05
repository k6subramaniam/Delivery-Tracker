import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../src/services/api';
import { DriverLocation } from '../../src/types';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = 'AIzaSyASjCRJRncSqfk-rn-iasw7MkDzezmKIL8';

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

  // Generate markers string for Google Maps Static API or embed
  const generateMapUrl = () => {
    if (locations.length === 0) {
      // Default center (San Francisco)
      return `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=37.7749,-122.4194&zoom=12`;
    }

    // If we have locations, create markers
    const markers = locations.map((loc, index) => 
      `${loc.latitude},${loc.longitude}`
    ).join('|');

    const center = locations[0];
    
    // Use places mode with first location
    return `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${center.latitude},${center.longitude}&zoom=12`;
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
        <View style={styles.contentContainer}>
          {/* Google Maps Embed */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                src={generateMapUrl()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 12,
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={48} color="#3B82F6" />
                <Text style={styles.mapPlaceholderText}>Map View</Text>
                <Text style={styles.mapPlaceholderSubtext}>
                  {locations.length} driver{locations.length !== 1 ? 's' : ''} on the map
                </Text>
              </View>
            )}
          </View>

          {/* Driver List */}
          <ScrollView
            style={styles.driverList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.listTitle}>Active Drivers</Text>
            {locations.map((location) => (
              <View key={location.driver_id} style={styles.driverCard}>
                <View style={styles.driverIcon}>
                  <Ionicons name="person" size={20} color="#3B82F6" />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{location.driver_name}</Text>
                  <Text style={styles.driverTime}>
                    Updated {format(new Date(location.timestamp), 'MMM d, h:mm a')}
                  </Text>
                  <Text style={styles.coordinates}>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={14} color="#10B981" />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
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
  contentContainer: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  driverList: {
    flex: 1,
    paddingHorizontal: 16,
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  driverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  driverTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  coordinates: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  locationBadge: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 20,
  },
});
