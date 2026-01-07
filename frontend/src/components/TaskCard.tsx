import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, Category, Priority } from '../types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#10B981';
    default: return '#F59E0B'; // Pending default
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Completed';
    default: return 'Pending';
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onComplete, onDelete }) => {
  const isCompleted = task.status === 'completed';
  const statusColor = getStatusColor(task.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: isCompleted ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[styles.statusText, { color: isCompleted ? '#10B981' : '#D97706' }]}>
              {getStatusLabel(task.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>${task.amount.toFixed(2)}</Text>
          </View>
          
          <Text style={styles.dateText}>
            {task.due_date ? format(new Date(task.due_date), 'MMM d, h:mm a') : format(new Date(task.created_at), 'MMM d')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // More rounded like Image 8
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent', // Prepare for active border if needed
  },
  contentContainer: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937', // Dark text
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    backgroundColor: '#EF6A46', // Orange pill for amount
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
