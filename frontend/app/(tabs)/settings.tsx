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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { categoriesAPI, prioritiesAPI, locationAPI } from '../../src/services/api';
import { Category, Priority } from '../../src/types';
import * as Location from 'expo-location';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
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
  const [categoryColor, setCategoryColor] = useState('#3B82F6');
  const [priorityName, setPriorityName] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('3');
  const [priorityColor, setPriorityColor] = useState('#EF4444');
  const [saving, setSaving] = useState(false);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

  useEffect(() => {
    loadData();
    checkLocationPermission();
  }, []);

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
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationEnabled(status === 'granted');
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
      const location = await Location.getCurrentPositionAsync({});
      await locationAPI.update({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationStatus('shared');
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
      setCategoryColor('#3B82F6');
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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleTag}>
                <Ionicons
                  name={user?.role === 'admin' ? 'shield-checkmark' : 'car'}
                  size={12}
                  color="#3B82F6"
                />
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Location Sharing (Drivers only) */}
        {isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Sharing</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="location" size={24} color="#3B82F6" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Share Location</Text>
                  <Text style={styles.settingDesc}>Status: {locationStatus}</Text>
                </View>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={toggleLocation}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={locationEnabled ? '#3B82F6' : '#9CA3AF'}
              />
            </View>
            {locationEnabled && (
              <TouchableOpacity
                style={styles.updateLocationButton}
                onPress={startLocationUpdates}
              >
                <Ionicons name="refresh" size={18} color="#3B82F6" />
                <Text style={styles.updateLocationText}>Update Location Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity
              style={styles.addSectionButton}
              onPress={() => openCategoryModal()}
            >
              <Ionicons name="add" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No categories yet</Text>
          ) : (
            categories.map((cat) => (
              <View key={cat.id} style={styles.itemRow}>
                <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                <Text style={styles.itemName}>{cat.name}</Text>
                <TouchableOpacity onPress={() => openCategoryModal(cat)}>
                  <Ionicons name="pencil" size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Priorities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Priorities</Text>
            <TouchableOpacity
              style={styles.addSectionButton}
              onPress={() => openPriorityModal()}
            >
              <Ionicons name="add" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {priorities.length === 0 ? (
            <Text style={styles.emptyText}>No priorities yet</Text>
          ) : (
            priorities.map((prio) => (
              <View key={prio.id} style={styles.itemRow}>
                <View style={[styles.colorDot, { backgroundColor: prio.color }]} />
                <Text style={styles.itemName}>{prio.name}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>L{prio.level}</Text>
                </View>
                <TouchableOpacity onPress={() => openPriorityModal(prio)}>
                  <Ionicons name="pencil" size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deletePriority(prio.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
                <ActivityIndicator size="small" color="#3B82F6" />
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
                <ActivityIndicator size="small" color="#3B82F6" />
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
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  addSectionButton: {
    padding: 4,
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    textTransform: 'capitalize',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  updateLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  levelBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
});
