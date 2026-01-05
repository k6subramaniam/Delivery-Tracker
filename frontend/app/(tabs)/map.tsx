import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../src/services/api';
import { DriverLocation } from '../../src/types';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = 'AIzaSyASjCRJRncSqfk-rn-iasw7MkDzezmKIL8';

export default function MapScreen() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  const loadLocations = async () => {
    try {
      const response = await driversAPI.getLocations();
      setLocations(response.data);

      if (response.data.length > 0 && mapRef.current) {
        const coords = response.data.map((loc: DriverLocation) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  }, []);

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
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: locations[0]?.latitude || 37.78825,
              longitude: locations[0]?.longitude || -122.4324,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {locations.map((location) => (
              <Marker
                key={location.driver_id}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.driver_name}
                description={`Last update: ${format(new Date(location.timestamp), 'h:mm a')}`}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.marker}>
                    <Ionicons name="car" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.markerPointer} />
                </View>
              </Marker>
            ))}
          </MapView>

          <ScrollView
            style={styles.driverList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
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
  mapContainer: {
    flex: 1,
  },
  map: {
    height: '50%',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3B82F6',
    marginTop: -2,
  },
  driverList: {
    flex: 1,
    padding: 16,
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
  locationBadge: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 20,
  },
});
