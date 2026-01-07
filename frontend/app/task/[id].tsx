import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI, categoriesAPI, prioritiesAPI, driversAPI } from '../../src/services/api';
import { Task, Category, Priority, User } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { format } from 'date-fns';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [task, setTask] = useState<Task | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [taskRes, catsRes, priosRes] = await Promise.all([
        tasksAPI.getOne(id!),
        categoriesAPI.getAll(),
        prioritiesAPI.getAll(),
      ]);
      
      const taskData = taskRes.data;
      setTask(taskData);
      setCategories(catsRes.data);
      setPriorities(priosRes.data);

      // Set form values
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setAmount(taskData.amount.toString());
      setSelectedCategory(taskData.category_id);
      setSelectedPriority(taskData.priority_id);
      setSelectedDriver(taskData.assigned_driver_id);
      setSelectedStatus(taskData.status);

      if (isAdmin) {
        const driversRes = await driversAPI.getAll();
        setDrivers(driversRes.data);
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await tasksAPI.update(id!, {
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        category_id: selectedCategory,
        priority_id: selectedPriority,
        assigned_driver_id: selectedDriver,
        status: selectedStatus,
      });
      setIsEditing(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksAPI.delete(id!);
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const handleComplete = async () => {
    try {
      await tasksAPI.complete(id!);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const getCategory = (catId: string | null) => categories.find(c => c.id === catId);
  const getPriority = (prioId: string | null) => priorities.find(p => p.id === prioId);
  const getDriver = (driverId: string | null) => drivers.find(d => d.id === driverId);

  const statusOptions = [
    { key: 'pending', label: 'Pending', color: '#6B7280' },
    { key: 'completed', label: 'Completed', color: '#10B981' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.headerButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
                {saving ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                <Ionicons name="pencil" size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing ? (
          // Edit Mode
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task title"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.statusOption,
                      { borderColor: option.color },
                      selectedStatus === option.key && { backgroundColor: option.color },
                    ]}
                    onPress={() => setSelectedStatus(option.key)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: selectedStatus === option.key ? '#FFF' : option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsRow}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.optionChip,
                        { borderColor: cat.color },
                        selectedCategory === cat.id && { backgroundColor: cat.color },
                      ]}
                      onPress={() => setSelectedCategory(
                        selectedCategory === cat.id ? null : cat.id
                      )}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selectedCategory === cat.id ? '#FFF' : cat.color },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsRow}>
                  {priorities.map(prio => (
                    <TouchableOpacity
                      key={prio.id}
                      style={[
                        styles.optionChip,
                        { borderColor: prio.color },
                        selectedPriority === prio.id && { backgroundColor: prio.color },
                      ]}
                      onPress={() => setSelectedPriority(
                        selectedPriority === prio.id ? null : prio.id
                      )}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selectedPriority === prio.id ? '#FFF' : prio.color },
                        ]}
                      >
                        {prio.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {isAdmin && drivers.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Assign to Driver</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {drivers.map(driver => (
                      <TouchableOpacity
                        key={driver.id}
                        style={[
                          styles.optionChip,
                          { borderColor: '#3B82F6' },
                          selectedDriver === driver.id && { backgroundColor: '#3B82F6' },
                        ]}
                        onPress={() => setSelectedDriver(
                          selectedDriver === driver.id ? null : driver.id
                        )}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: selectedDriver === driver.id ? '#FFF' : '#3B82F6' },
                          ]}
                        >
                          {driver.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

          </>
        ) : (
          // View Mode
          <>
            <View style={styles.titleSection}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>${task.amount.toFixed(2)}</Text>
              </View>
            </View>

            {task.description ? (
              <Text style={styles.description}>{task.description}</Text>
            ) : null}

            <View style={styles.tagsSection}>
              {getCategory(task.category_id) && (
                <View style={[styles.tag, { backgroundColor: getCategory(task.category_id)!.color + '20' }]}>
                  <View style={[styles.tagDot, { backgroundColor: getCategory(task.category_id)!.color }]} />
                  <Text style={[styles.tagText, { color: getCategory(task.category_id)!.color }]}>
                    {getCategory(task.category_id)!.name}
                  </Text>
                </View>
              )}
              {getPriority(task.priority_id) && (
                <View style={[styles.tag, { backgroundColor: getPriority(task.priority_id)!.color + '20' }]}>
                  <View style={[styles.tagDot, { backgroundColor: getPriority(task.priority_id)!.color }]} />
                  <Text style={[styles.tagText, { color: getPriority(task.priority_id)!.color }]}>
                    {getPriority(task.priority_id)!.name}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="flag" size={20} color="#6B7280" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: statusOptions.find(s => s.key === task.status)?.color + '20' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: statusOptions.find(s => s.key === task.status)?.color }
                    ]}>
                      {task.status.replace('-', ' ')}
                    </Text>
                  </View>
                </View>
              </View>

              {task.due_date && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar" size={20} color="#6B7280" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(task.due_date), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              )}

              {isAdmin && getDriver(task.assigned_driver_id) && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="person" size={20} color="#6B7280" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Assigned Driver</Text>
                    <Text style={styles.detailValue}>
                      {getDriver(task.assigned_driver_id)!.name}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="time" size={20} color="#6B7280" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>
                    {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
              </View>

              {task.completed_at && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>
                      {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {task.status !== 'completed' && (
              <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  content: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 12,
  },
  amountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
