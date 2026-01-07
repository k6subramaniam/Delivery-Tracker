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
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../src/services/api';
import { DriverLocation } from '../../src/types';
import { format } from 'date-fns';

import { useTheme } from '../../src/context/ThemeContext';

// Helper component to resolve and display address
const AddressDisplay = ({ lat, lng }: { lat: number; lng: number }) => {
  const [address, setAddress] = useState<string>(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  const { colors } = useTheme();

  useEffect(() => {
    let isMounted = true;
    const resolveAddress = async () => {
      try {
        if (Platform.OS === 'web') {
          // Use Nominatim for web
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'User-Agent': 'DeliveryTrackerApp/1.0' } }
          );
          const data = await response.json();
          if (isMounted && data.address) {
            const road = data.address.road || '';
            const number = data.address.house_number || '';
            const city = data.address.city || data.address.town || data.address.village || '';
            const formatted = `${number} ${road}, ${city}`.trim().replace(/^,/, '').trim();
            if (formatted) setAddress(formatted);
          }
        } else {
          // Use native geocoder
          const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (isMounted && result) {
            const formatted = `${result.streetNumber || ''} ${result.street || ''}, ${result.city || ''}`.trim();
            if (formatted) setAddress(formatted);
          }
        }
      } catch (e) {
        // Fallback to coordinates on error
      }
    };

    resolveAddress();
    return () => { isMounted = false; };
  }, [lat, lng]);

  return (
    <Text style={[styles.addressText, { color: colors.textSecondary }]}>
      {address}
    </Text>
  );
};

export default function MapScreen() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors, theme } = useTheme();

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

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([43.6532, -79.3832], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          var locations = ${JSON.stringify(locations)};
          var bounds = L.latLngBounds();

          if (locations.length > 0) {
            locations.forEach(function(loc) {
              var marker = L.marker([loc.latitude, loc.longitude]).addTo(map);
              marker.bindPopup("<b>" + loc.driver_name + "</b><br>Active");
              bounds.extend([loc.latitude, loc.longitude]);
            });
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else {
             // Default view if no locations
             map.setView([43.6532, -79.3832], 13);
          }
        </script>
      </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Map Visual Representation */}
        <View style={styles.mapVisual}>
          <View style={[styles.mapBackground, { backgroundColor: theme === 'dark' ? '#333' : '#E5E7EB' }]}>
            {Platform.OS === 'web' ? (
               <iframe
                 srcDoc={mapHtml}
                 style={{ width: '100%', height: '100%', border: 'none' }}
               />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={{ flex: 1 }}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>

        {/* Bottom Sheet Style List */}
        <View style={[styles.bottomSheet, { backgroundColor: colors.card, shadowColor: theme === 'dark' ? 'transparent' : '#000' }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.listTitle, { color: colors.headerText }]}>Nearby Tasks</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {locations.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active drivers found</Text>
              </View>
            ) : (
              locations.map((location) => (
                <TouchableOpacity
                  key={location.driver_id}
                  style={[styles.driverCard, { backgroundColor: theme === 'dark' ? '#333' : '#FFFFFF', shadowColor: theme === 'dark' ? 'transparent' : '#000' }]}
                  onPress={() => openInMaps(location.latitude, location.longitude)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.taskTitle, { color: colors.primary }]}>Package Delivery</Text>
                    <Text style={[styles.driverName, { color: colors.text }]}>{location.driver_name}</Text>
                  </View>
                  <AddressDisplay lat={location.latitude} lng={location.longitude} />
                  <View style={styles.cardFooter}>
                    <Text style={[styles.distanceText, { color: colors.text }]}>Active</Text>
                    <View style={[styles.statusBadge, { backgroundColor: theme === 'dark' ? '#442' : '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: '#D97706' }]}>Pending</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.viewDetailsButton, { backgroundColor: colors.primary }]}>
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
    aspectRatio: 1, // Make it a square
    width: '100%',
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
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
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
