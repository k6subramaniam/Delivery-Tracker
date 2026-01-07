import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { dashboardAPI, tasksAPI } from '../../src/services/api';
import { StatCard } from '../../src/components/StatCard';
import { TaskCard } from '../../src/components/TaskCard';
import { DashboardStats, Task, Category, Priority } from '../../src/types';
import { categoriesAPI, prioritiesAPI } from '../../src/services/api';
import { useRouter } from 'expo-router';

// Define type for driver earnings
interface DriverEarnings {
  driver_id: string;
  driver_name: string;
  total_earnings: number;
  task_count: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [driverEarnings, setDriverEarnings] = useState<DriverEarnings[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const promises: Promise<any>[] = [
        dashboardAPI.getStats(),
        categoriesAPI.getAll(),
        prioritiesAPI.getAll(),
      ];

      // Different data fetching based on role
      if (isAdmin) {
        // Admins see all tasks (we'll fetch recent tasks for context, but mainly focus on driver payments)
        promises.push(tasksAPI.getAll());
        // Add driver payments fetch
        promises.push(dashboardAPI.getDriverPayments());
      } else {
        // Drivers see only their COMPLETED tasks as "owed payments"
        promises.push(tasksAPI.getAll({ status: 'completed' }));
      }

      const results = await Promise.all(promises);
      
      const statsRes = results[0];
      const catsRes = results[1];
      const priosRes = results[2];
      
      setStats(statsRes.data);
      setCategories(catsRes.data);
      setPriorities(priosRes.data);

      if (isAdmin) {
        // results[3] is tasks, results[4] is driver earnings
        setRecentTasks(results[3].data.slice(0, 5));
        setDriverEarnings(results[4].data);
      } else {
        // results[3] is filtered tasks
        setRecentTasks(results[3].data.slice(0, 5)); // Show recent 5 completed
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await tasksAPI.complete(taskId);
      loadData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getCategory = (id: string | null) => categories.find(c => c.id === id);
  const getPriority = (id: string | null) => priorities.find(p => p.id === id);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={styles.roleTag}>
            <Ionicons 
              name={isAdmin ? 'shield-checkmark' : 'car'} 
              size={16} 
              color="#3B82F6" 
            />
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {/* ... existing stats grid ... */}
          <View style={styles.statsRow}>
            <View style={styles.statHalf}>
              <StatCard
                title="Total Tasks"
                value={stats?.total_tasks || 0}
                icon="layers"
                color="#3B82F6"
              />
            </View>
            <View style={styles.statHalf}>
              <StatCard
                title="Pending"
                value={stats?.pending_tasks || 0}
                icon="time"
                color="#F59E0B"
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statHalf}>
              <StatCard
                title="Completed"
                value={stats?.completed_tasks || 0}
                icon="checkmark-circle"
                color="#10B981"
              />
            </View>
            <View style={styles.statHalf}>
              <StatCard
                title="Overdue"
                value={stats?.overdue_tasks || 0}
                icon="alert-circle"
                color="#EF4444"
              />
            </View>
          </View>
          <StatCard
            title={isDriver ? "Total Earnings" : "Total Paid Out"}
            value={`$${(stats?.total_earnings || 0).toFixed(2)}`}
            icon="cash"
            color="#059669"
            subtitle="From completed deliveries"
          />
          {isAdmin && (
            <StatCard
              title="Active Drivers"
              value={stats?.driver_count || 0}
              icon="people"
              color="#8B5CF6"
            />
          )}
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isAdmin ? 'Drivers Owed Payments' : 'Recent Earnings (Owed Payments)'}
            </Text>
            {isDriver && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { filter: 'completed' } })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {isAdmin ? (
            // Admin View: List of Drivers and their earnings
            driverEarnings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No pending payments for drivers</Text>
              </View>
            ) : (
              driverEarnings.map(earning => (
                <View key={earning.driver_id} style={styles.earningCard}>
                  <View style={styles.earningInfo}>
                    <View style={styles.earningIcon}>
                      <Ionicons name="person" size={20} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.earningName}>{earning.driver_name}</Text>
                      <Text style={styles.earningSubtext}>{earning.task_count} completed tasks</Text>
                    </View>
                  </View>
                  <Text style={styles.earningAmount}>${earning.total_earnings.toFixed(2)}</Text>
                </View>
              ))
            )
          ) : (
            // Driver View: List of Completed Tasks
            recentTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No completed tasks yet</Text>
              </View>
            ) : (
              recentTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  category={getCategory(task.category_id)}
                  priority={getPriority(task.priority_id)}
                  onPress={() => router.push(`/task/${task.id}`)}
                  // Don't show complete/delete actions here as it's a history view
                />
              ))
            )
          )}
        </View>
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'capitalize',
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statHalf: {
    flex: 1,
  },
  recentSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  earningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  earningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earningName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  earningSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
});
