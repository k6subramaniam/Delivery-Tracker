import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, Category, Priority } from '../types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  category?: Category;
  priority?: Priority;
  onPress: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#10B981';
    case 'in-progress': return '#F59E0B';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return 'checkmark-circle';
    case 'in-progress': return 'time';
    default: return 'ellipse-outline';
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, category, priority, onPress, onComplete, onDelete }) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {onComplete && task.status !== 'completed' && (
            <TouchableOpacity onPress={onComplete} style={styles.completeButton}>
              <Ionicons name="ellipse-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
          {task.status === 'completed' && (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          )}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, task.status === 'completed' && styles.completedTitle]} numberOfLines={1}>
              {task.title}
            </Text>
            {task.description ? (
              <Text style={styles.description} numberOfLines={1}>{task.description}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.rightSection}>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>${task.amount.toFixed(2)}</Text>
          </View>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.tags}>
          {category && (
            <View style={[styles.tag, { backgroundColor: category.color + '20' }]}>
              <Text style={[styles.tagText, { color: category.color }]}>{category.name}</Text>
            </View>
          )}
          {priority && (
            <View style={[styles.tag, { backgroundColor: priority.color + '20' }]}>
              <Text style={[styles.tagText, { color: priority.color }]}>{priority.name}</Text>
            </View>
          )}
          <View style={[styles.tag, { backgroundColor: getStatusColor(task.status) + '20' }]}>
            <Ionicons name={getStatusIcon(task.status) as any} size={12} color={getStatusColor(task.status)} />
            <Text style={[styles.tagText, { color: getStatusColor(task.status), marginLeft: 4 }]}>
              {task.status.replace('-', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.dateContainer}>
          {task.due_date && (
            <View style={[styles.dateTag, isOverdue && styles.overdueTag]}>
              <Ionicons name="calendar-outline" size={12} color={isOverdue ? '#EF4444' : '#6B7280'} />
              <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
                {format(new Date(task.due_date), 'MMM d')}
              </Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {format(new Date(task.created_at), 'MMM d, h:mm a')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    marginRight: 12,
    padding: 2,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  amountContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
