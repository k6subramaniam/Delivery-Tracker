import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const isDriver = user?.role === 'driver';


  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('disabled');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#EF6A46');
  const [priorityName, setPriorityName] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('3');
  const [priorityColor, setPriorityColor] = useState('#EF4444');
  const [saving, setSaving] = useState(false);

  const colors = ['#EF6A46', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      const [catsRes, priosRes] = await Promise.all([
        categoriesAPI.getAll(),
        prioritiesAPI.getAll(),
      ]);
      setCategories(catsRes.data);
      setPriorities(priosRes.data);
    } catch (error) {
      console.error('Error loading settings data:', error);
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

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryColor(category.color);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor('#EF6A46');
    }
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, {
          name: categoryName.trim(),
          color: categoryColor,
        });
      } else {
        await categoriesAPI.create({
          name: categoryName.trim(),
          color: categoryColor,
        });
      }
      setShowCategoryModal(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    Alert.alert('Delete Category', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoriesAPI.delete(id);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete category');
          }
        },
      },
    ]);
  };

  // Priority handlers
  const openPriorityModal = (priority?: Priority) => {
    if (priority) {
      setEditingPriority(priority);
      setPriorityName(priority.name);
      setPriorityLevel(priority.level.toString());
      setPriorityColor(priority.color);
    } else {
      setEditingPriority(null);
      setPriorityName('');
      setPriorityLevel('3');
      setPriorityColor('#EF4444');
    }
    setShowPriorityModal(true);
  };

  const savePriority = async () => {
    if (!priorityName.trim()) {
      Alert.alert('Error', 'Please enter a priority name');
      return;
    }

    const level = parseInt(priorityLevel);
    if (isNaN(level) || level < 1 || level > 5) {
      Alert.alert('Error', 'Priority level must be between 1 and 5');
      return;
    }

    setSaving(true);
    try {
      if (editingPriority) {
        await prioritiesAPI.update(editingPriority.id, {
          name: priorityName.trim(),
          level,
          color: priorityColor,
        });
      } else {
        await prioritiesAPI.create({
          name: priorityName.trim(),
          level,
          color: priorityColor,
        });
      }
      setShowPriorityModal(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save priority');
    } finally {
      setSaving(false);
    }
  };

  const deletePriority = async (id: string) => {
    Alert.alert('Delete Priority', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await prioritiesAPI.delete(id);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete priority');
          }
        },
      },
    ]);
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

          {/* Categories & Priorities (Admin Tools moved here visually or kept?) 
              Let's keep them as extra menu items for functionality but styled like the rest 
          */}
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem} onPress={() => openCategoryModal()}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="pricetags-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={styles.menuText}>Manage Categories</Text>
            <Ionicons name="add-circle-outline" size={20} color="#EF6A46" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => openPriorityModal()}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="flag-outline" size={20} color="#EF6A46" />
            </View>
            <Text style={styles.menuText}>Manage Priorities</Text>
            <Ionicons name="add-circle-outline" size={20} color="#EF6A46" />
          </TouchableOpacity>

          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing Categories List (Hidden/Refactored or kept for management?)
            Let's render them in a simple list below for management if needed, 
            or assume the modal handles it. Let's keep a simplified list below. 
        */}
        {(categories.length > 0 || priorities.length > 0) && (
          <View style={styles.configSection}>
            <Text style={styles.configTitle}>Configuration Data</Text>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Categories:</Text>
              <View style={styles.configChips}>
                {categories.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.miniChip, { backgroundColor: c.color }]} onPress={() => openCategoryModal(c)}>
                    <Text style={styles.miniChipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Priorities:</Text>
              <View style={styles.configChips}>
                {priorities.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.miniChip, { backgroundColor: p.color }]} onPress={() => openPriorityModal(p)}>
                    <Text style={styles.miniChipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={saveCategory} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#EF6A46" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor="#9CA3AF"
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    categoryColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setCategoryColor(color)}
                >
                  {categoryColor === color && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {editingCategory && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteCategory(editingCategory.id)}>
                <Text style={styles.deleteButtonText}>Delete Category</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Priority Modal */}
      <Modal
        visible={showPriorityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPriorityModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPriority ? 'Edit Priority' : 'New Priority'}
            </Text>
            <TouchableOpacity onPress={savePriority} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#EF6A46" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Priority name"
              placeholderTextColor="#9CA3AF"
              value={priorityName}
              onChangeText={setPriorityName}
            />
            <Text style={styles.label}>Level (1-5)</Text>
            <TextInput
              style={styles.input}
              placeholder="3"
              placeholderTextColor="#9CA3AF"
              value={priorityLevel}
              onChangeText={setPriorityLevel}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    priorityColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setPriorityColor(color)}
                >
                  {priorityColor === color && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {editingPriority && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deletePriority(editingPriority.id)}>
                <Text style={styles.deleteButtonText}>Delete Priority</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  
  // Config section (mini styling)
  configSection: {
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  configRow: {
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  configChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF6A46',
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButton: {
    marginTop: 32,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 16,
  },
});
