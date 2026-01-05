export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'driver';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export interface Priority {
  id: string;
  name: string;
  level: number;
  color: string;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  amount: number;
  category_id: string | null;
  priority_id: string | null;
  status: 'pending' | 'in-progress' | 'completed';
  due_date: string | null;
  assigned_driver_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DriverLocation {
  driver_id: string;
  driver_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface DashboardStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  total_earnings: number;
  driver_count: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
