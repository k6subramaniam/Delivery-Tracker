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
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF6A46" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Floating Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchText}>Deliveries</Text>
          <Ionicons name="search" size={24} color="#EF6A46" />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color="#EF6A46" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF6A46" />
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
            
            {/* Store markers (Static for visual) */}
            <View style={[styles.storeMarker, { top: '20%', left: '20%' }]}>
              <Ionicons name="storefront" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.storeMarker, { top: '35%', right: '15%' }]}>
              <Ionicons name="storefront" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.storeMarker, { bottom: '30%', left: '10%' }]}>
              <Ionicons name="storefront" size={16} color="#FFFFFF" />
            </View>

            {/* Driver markers positioned randomly for visual */}
            {locations.length > 0 ? (
              locations.map((loc, index) => {
                const xPercent = ((Math.abs(loc.longitude) % 90) / 90) * 80 + 10;
                const yPercent = ((Math.abs(loc.latitude) % 90) / 90) * 80 + 10;
                return (
                  <TouchableOpacity
                    key={loc.driver_id}
                    style={[styles.mapMarker, { left: `${xPercent}%`, top: `${yPercent}%` }]}
                    onPress={() => openInMaps(loc.latitude, loc.longitude)}
                  >
                    <View style={styles.markerPulse} />
                    <View style={styles.markerDot}>
                      <Ionicons name="bus" size={16} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              // Demo marker if no drivers
              <View style={[styles.mapMarker, { left: '50%', top: '50%' }]}>
                <View style={styles.markerPulse} />
                <View style={styles.markerDot}>
                  <Ionicons name="bus" size={16} color="#FFFFFF" />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Sheet Style List */}
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.listTitle}>Nearby Tasks</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {locations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active drivers found</Text>
              </View>
            ) : (
              locations.map((location) => (
                <TouchableOpacity
                  key={location.driver_id}
                  style={styles.driverCard}
                  onPress={() => openInMaps(location.latitude, location.longitude)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.driverName}>Package Delivery - {location.driver_name}</Text>
                  </View>
                  <Text style={styles.addressText}>123 Main St, Suite 4B</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.distanceText}>0.5 miles</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Pending</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Creamy background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexGrow: 1,
  },
  mapVisual: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: -24, // Overlap effect
    zIndex: 1,
  },
  mapBackground: {
    height: 400,
    backgroundColor: '#E5E7EB', // Greyish map bg
    borderRadius: 0, // Full bleed visual simulation
    overflow: 'hidden',
    position: 'relative',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 8, // Thicker roads
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 8,
  },
  storeMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF6A46', // Orange marker
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
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF6A46',
    opacity: 0.3,
  },
  markerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF6A46',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheet: {
    backgroundColor: '#FFF7ED', // Light cream sheet
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 32,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 2,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3E2D2B', // Dark brown
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF6A46', // Orange name
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  viewDetailsButton: {
    backgroundColor: '#EF6A46',
    borderRadius: 24, // Fully rounded
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    width: 280,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
