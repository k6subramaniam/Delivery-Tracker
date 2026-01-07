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
import { tasksAPI, driversAPI } from '../../src/services/api';
import { Task, User } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { format } from 'date-fns';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [task, setTask] = useState<Task | null>(null);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const taskRes = await tasksAPI.getOne(id!);
      
      const taskData = taskRes.data;
      setTask(taskData);

      // Set form values
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setAmount(taskData.amount.toString());
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

  const getDriver = (driverId: string | null) => drivers.find(d => d.id === driverId);

  const statusOptions = [
    { key: 'pending', label: 'Pending', color: '#D97706' },
    { key: 'completed', label: 'Completed', color: '#10B981' },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.headerActionText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>{isEditing ? 'Edit Task' : 'Task Details'}</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Task</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
              <Text style={[styles.headerActionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing ? (
          // Edit Mode (Matching Create Task Style)
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.primary }]}
                placeholder="Enter task title"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter description"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
              <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}>
                <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
              <View style={[styles.segmentedControl, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.segmentButton,
                      selectedStatus === option.key && { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' },
                      selectedStatus === option.key && { borderColor: option.color }
                    ]}
                    onPress={() => setSelectedStatus(option.key)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: selectedStatus === option.key ? option.color : colors.textSecondary },
                        selectedStatus === option.key && { fontWeight: '700' }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isAdmin && drivers.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Assign to Driver</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {drivers.map(driver => (
                      <TouchableOpacity
                        key={driver.id}
                        style={[
                          styles.optionChip,
                          { borderColor: colors.border, backgroundColor: colors.inputBg },
                          selectedDriver === driver.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedDriver(
                          selectedDriver === driver.id ? null : driver.id
                        )}
                      >
                        <Ionicons
                          name="person"
                          size={14}
                          color={selectedDriver === driver.id ? '#FFF' : colors.primary}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            { color: selectedDriver === driver.id ? '#FFF' : colors.primary },
                            selectedDriver === driver.id && { fontWeight: '700' },
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
              <Text style={[styles.taskTitle, { color: colors.headerText }]}>{task.title}</Text>
              <View style={[styles.amountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.amountText}>${task.amount.toFixed(2)}</Text>
              </View>
            </View>

            {task.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description}</Text>
            ) : null}

            <View style={styles.tagsSection}>
              <View style={[
                styles.tag, 
                { backgroundColor: task.status === 'completed' ? (theme === 'dark' ? '#064E3B' : '#D1FAE5') : (theme === 'dark' ? '#78350F' : '#FEF3C7') }
              ]}>
                <Text style={[
                  styles.tagText, 
                  { color: task.status === 'completed' ? '#10B981' : '#F59E0B' }
                ]}>
                  {task.status === 'completed' ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={[styles.detailsCard, { backgroundColor: colors.card, shadowColor: theme === 'dark' ? '#000' : '#000' }]}>
              {isAdmin && getDriver(task.assigned_driver_id) && (
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.detailIcon, { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' }]}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned Driver</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {getDriver(task.assigned_driver_id)!.name}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.detailIcon, { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' }]}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created On</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
              </View>

              {task.completed_at && (
                <View style={[styles.detailRow, { borderBottomColor: 'transparent' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: theme === 'dark' ? '#064E3B' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed On</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>
                      {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {task.status !== 'completed' && (
              <TouchableOpacity style={[styles.completeButton, { backgroundColor: '#10B981' }]} onPress={handleComplete}>
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
