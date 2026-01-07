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
    { key: 'pending', label: 'Pending', color: '#D97706' },
    { key: 'completed', label: 'Completed', color: '#10B981' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF6A46" />
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
          <Text style={styles.headerActionText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Task' : 'Task Details'}</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Task</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
              <Text style={[styles.headerActionText, { color: '#EF6A46' }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing ? (
          // Edit Mode (Matching Create Task Style)
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
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
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.segmentedControl}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.segmentButton,
                      selectedStatus === option.key && styles.segmentButtonActive,
                      selectedStatus === option.key && { backgroundColor: option.color + '20', borderColor: option.color }
                    ]}
                    onPress={() => setSelectedStatus(option.key)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selectedStatus === option.key && { color: option.color, fontWeight: '700' }
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
                        selectedCategory === cat.id && { backgroundColor: '#EF6A46', borderColor: '#EF6A46' }
                      ]}
                      onPress={() => setSelectedCategory(
                        selectedCategory === cat.id ? null : cat.id
                      )}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedCategory === cat.id && { color: '#FFF', fontWeight: '700' }
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
                        selectedPriority === prio.id && { backgroundColor: prio.color + '20', borderColor: prio.color }
                      ]}
                      onPress={() => setSelectedPriority(
                        selectedPriority === prio.id ? null : prio.id
                      )}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedPriority === prio.id && { color: prio.color, fontWeight: '700' }
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
                          selectedDriver === driver.id && { backgroundColor: '#EF6A46', borderColor: '#EF6A46' },
                        ]}
                        onPress={() => setSelectedDriver(
                          selectedDriver === driver.id ? null : driver.id
                        )}
                      >
                        <Ionicons
                          name="person"
                          size={14}
                          color={selectedDriver === driver.id ? '#FFF' : '#EF6A46'}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            selectedDriver === driver.id && { color: '#FFF', fontWeight: '700' },
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

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Task</Text>
            </TouchableOpacity>

          </>
        ) : (
          // View Mode (Updated Style)
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
              <View style={[
                styles.tag, 
                { backgroundColor: task.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.tagText, 
                  { color: task.status === 'completed' ? '#10B981' : '#D97706' }
                ]}>
                  {task.status === 'completed' ? 'Completed' : 'Pending'}
                </Text>
              </View>

              {getCategory(task.category_id) && (
                <View style={[styles.tag, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={[styles.tagText, { color: '#4B5563' }]}>
                    {getCategory(task.category_id)!.name}
                  </Text>
                </View>
              )}
              
              {getPriority(task.priority_id) && (
                <View style={[styles.tag, { backgroundColor: getPriority(task.priority_id)!.color + '20' }]}>
                  <Text style={[styles.tagText, { color: getPriority(task.priority_id)!.color }]}>
                    {getPriority(task.priority_id)!.name}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailsCard}>
              {isAdmin && getDriver(task.assigned_driver_id) && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="person" size={20} color="#EF6A46" />
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
                  <Ionicons name="time" size={20} color="#EF6A46" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Created On</Text>
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
                    <Text style={styles.detailLabel}>Completed On</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>
                      {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {task.status !== 'completed' && (
              <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
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
    backgroundColor: '#FFF9F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerActionText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF6A46',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: '#EF6A46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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
    borderColor: '#EF6A46',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF6A46',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentButtonActive: {
    backgroundColor: '#FFF7ED',
  },
  segmentText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  
  // View Mode Styles
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 12,
  },
  amountBadge: {
    backgroundColor: '#EF6A46',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  completeButton: {
    backgroundColor: '#EF6A46',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#EF6A46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
