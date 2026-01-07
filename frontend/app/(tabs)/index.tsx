import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { dashboardAPI, tasksAPI, messagesAPI } from '../../src/services/api';
import { StatCard } from '../../src/components/StatCard';
import { TaskCard } from '../../src/components/TaskCard';
import { DashboardStats, Task } from '../../src/types';
import { useRouter, useFocusEffect } from 'expo-router';

import { useTheme } from '../../src/context/ThemeContext';

// Define type for driver earnings
interface DriverEarnings {
  driver_id: string;
  driver_name: string;
  total_earnings: number;
  task_count: number;
  pending_amount: number;
  pending_count: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [driverEarnings, setDriverEarnings] = useState<DriverEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const promises: Promise<any>[] = [
        dashboardAPI.getStats(),
        messagesAPI.getUnreadCount(),
      ];

      // Different data fetching based on role
      if (isAdmin) {
        // Admins see all tasks (we'll fetch recent tasks for context, but mainly focus on driver payments)
        promises.push(tasksAPI.getAll());
        // Add driver payments fetch
        promises.push(dashboardAPI.getDriverPayments());
      } else {
        // Drivers see ALL tasks to manage their work and see payments
        promises.push(tasksAPI.getAll());
      }

      const results = await Promise.all(promises);
      
      const statsRes = results[0];
      setStats(statsRes.data);
      if (results[1]) setUnreadCount(results[1].data.count);

      if (isAdmin) {
        // results[2] is tasks, results[3] is driver earnings
        setRecentTasks(results[2].data.slice(0, 5));
        setDriverEarnings(results[3].data);
      } else {
        // Drivers: Fetch ALL tasks so they can see pending work too
        const allTasks = results[2].data;
        setRecentTasks(allTasks.slice(0, 5)); // Show recent 5 of ANY status
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }, [loadData])
  );

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

  const getCategory = (id: string | null) => null;
  const getPriority = (id: string | null) => null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF6A46" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            <View style={[styles.avatarContainer, { borderColor: colors.card }]}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=12' }} // Placeholder avatar
                style={styles.avatar} 
              />
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {isAdmin ? 'Good Morning,' : 'Hello,'}
              </Text>
              <Text style={[styles.userName, { color: colors.headerText }]}>{isAdmin ? 'Admin' : user?.name || 'Driver'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.notificationButton, { backgroundColor: colors.card, shadowColor: theme === 'dark' ? '#000' : '#000' }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.primary, borderColor: colors.card }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Dashboard Cards Grid */}
        <View style={styles.statsGrid}>
          {/* Main Large Card */}
          <View style={[styles.mainCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
            <View style={[styles.mainCardDecorator, { backgroundColor: colors.primary }]} />
            <Text style={[styles.mainCardTitle, { color: colors.textSecondary }]}>{isAdmin ? 'Total Tasks' : "Today's Tasks"}</Text>
            <Text style={[styles.mainCardValue, { color: colors.primary }]}>{stats?.total_tasks || 0}</Text>
            <Text style={[styles.mainCardSubtitle, { color: colors.textSecondary }]}>
              {isAdmin ? 'Tasks delivered today' : 'Tasks for today'}
            </Text>
          </View>

          {/* Row of Small Cards */}
          <View style={styles.statsRow}>
            {/* Earnings Card (Small) */}
            <View style={[styles.smallCard, { flex: 1, backgroundColor: colors.card }]}>
              <View style={[styles.smallCardIndicator, { backgroundColor: colors.primary }]} />
              <Text style={[styles.smallCardTitle, { color: colors.textSecondary }]}>Earnings</Text>
              <Text style={[styles.smallCardValue, { color: colors.primary }]}>
                {isDriver ? (stats?.total_tasks || 0) * 10 : (stats?.pending_tasks || 0)} 
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? '#333' : '#FFE4DB' }]}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
              </View>
            </View>

            {/* Pending Card (Small) */}
            <View style={[styles.smallCard, { flex: 1, marginHorizontal: 12, backgroundColor: colors.card }]}>
              <View style={[styles.smallCardIndicator, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.smallCardTitle, { color: colors.textSecondary }]}>Pending</Text>
              <Text style={[styles.smallCardValue, { color: colors.text }]}>{stats?.pending_tasks || 0}</Text>
              <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? '#333' : '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
              </View>
            </View>

            {/* Completed Card (Small) */}
            <View style={[styles.smallCard, { flex: 1, backgroundColor: colors.card }]}>
              <View style={[styles.smallCardIndicator, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.smallCardTitle, { color: colors.textSecondary }]}>Completed</Text>
              <Text style={[styles.smallCardValue, { color: colors.text }]}>{stats?.completed_tasks || 0}</Text>
              <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? '#333' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              </View>
            </View>
          </View>

          {/* Large Earnings Graph Card */}
          <View style={[styles.earningsCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.earningsCardTitle, { color: colors.text }]}>Earnings</Text>
            <View style={styles.earningsRow}>
              <Text style={[styles.earningsAmount, { color: colors.primary }]}>${(stats?.total_earnings || 0).toFixed(2)}</Text>
              <Ionicons name="trending-up" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
            </View>
            <Text style={[styles.earningsSubtitle, { color: colors.textSecondary }]}>
              Total Earnings {isAdmin ? 'this month' : 'today'}
            </Text>
            
            {/* Visual Wave Line (Mock) */}
            <View style={styles.waveContainer}>
               <View style={[styles.waveLine, { borderColor: colors.primary }]} />
               <View style={[styles.waveLine, { top: 10, opacity: 0.5, borderColor: colors.primary }]} />
            </View>
          </View>
        </View>

        {/* Admin "Active Drivers" Section */}
        {isAdmin && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Drivers</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View Map</Text>
              </TouchableOpacity>
            </View>
            
            {/* We can re-use driverEarnings list for now as "Active" typically means earning/working, 
                or if we had a separate online status we'd use that. The prompt implies visibility is key.
                Let's show a horizontal list of driver avatars or simple status cards. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
               {driverEarnings.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active drivers</Text>
               ) : (
                 driverEarnings.map(d => (
                   <View key={d.driver_id} style={[styles.activeDriverCard, { backgroundColor: colors.card }]}>
                      <View style={[styles.activeDriverAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.activeDriverInitials}>{d.driver_name.charAt(0)}</Text>
                      </View>
                      <Text style={[styles.activeDriverName, { color: colors.text }]} numberOfLines={1}>{d.driver_name}</Text>
                      <Text style={[styles.activeDriverStatus, { color: colors.textSecondary }]}>Online</Text>
                   </View>
                 ))
               )}
            </ScrollView>
          </View>
        )}

        {/* List Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isAdmin ? 'Drivers Activity & Payments' : 'Recent Tasks'}
            </Text>
            {isDriver && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/tasks' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {isAdmin ? (
            // Admin View: List of Drivers
            driverEarnings.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No driver activity yet</Text>
              </View>
            ) : (
              driverEarnings.map(earning => (
                <View key={earning.driver_id} style={[styles.earningCard, { backgroundColor: colors.card }]}>
                  <View style={styles.earningInfo}>
                    <View style={[styles.earningIcon, { backgroundColor: theme === 'dark' ? '#333' : '#FFF7ED' }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.earningName, { color: colors.text }]} numberOfLines={1}>{earning.driver_name}</Text>
                      <Text style={[styles.earningSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                        {earning.task_count} completed • {earning.pending_count} pending
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8, minWidth: 80 }}>
                    <Text style={[styles.earningAmount, { color: colors.text }]}>${earning.total_earnings.toFixed(2)}</Text>
                    {earning.pending_amount > 0 && (
                      <Text style={[styles.earningSubtext, { color: '#F59E0B' }]}>
                        +${earning.pending_amount.toFixed(2)} pending
                      </Text>
                    )}
                    <TouchableOpacity 
                      onPress={() => router.push(`/chat/${earning.driver_id}`)}
                      style={{ marginTop: 4, padding: 4 }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            // Driver View: List of Tasks
            recentTasks.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks yet</Text>
              </View>
            ) : (
              recentTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onComplete={() => handleCompleteTask(task.id)}
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
  // ... keep structure but remove hardcoded colors in component if possible, 
  // but for styles.create we usually keep layout. 
  // We'll update inline styles for colors.
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF6A46',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  statsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  mainCard: {
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCardDecorator: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  mainCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mainCardValue: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
  },
  mainCardSubtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
    height: 120,
    justifyContent: 'space-between',
  },
  smallCardIndicator: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  smallCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  smallCardValue: {
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  earningsCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  earningsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  earningsSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  waveContainer: {
    marginTop: 20,
    height: 40,
    position: 'relative',
  },
  waveLine: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 60,
    borderTopWidth: 2,
    borderRadius: 100,
    transform: [{ scaleX: 1.5 }],
    opacity: 0.3,
  },
  recentSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  earningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  earningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earningName: {
    fontSize: 16,
    fontWeight: '700',
  },
  earningSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  
  // New Active Driver Card
  activeDriverCard: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDriverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeDriverInitials: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  activeDriverName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeDriverStatus: {
    fontSize: 12,
  },
});
