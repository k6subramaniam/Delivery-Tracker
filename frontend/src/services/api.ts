import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Tasks API
export const tasksAPI = {
  getAll: (params?: { status?: string; assigned_driver_id?: string }) =>
    api.get('/tasks', { params }),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  complete: (id: string) => api.put(`/tasks/${id}/complete`),
};

// Messages API
export const messagesAPI = {
  send: (data: { receiver_id: string; content: string }) => api.post('/messages/send', data),
  getConversation: (otherUserId: string) => api.get(`/messages/conversation/${otherUserId}`),
};

// Admin API
export const adminAPI = {
  resetData: () => api.delete('/admin/reset-data'),
};

// Drivers API
export const driversAPI = {
  getAll: () => api.get('/drivers'),
  getLocations: () => api.get('/drivers/locations'),
  getLocation: (id: string) => api.get(`/drivers/${id}/location`),
};

// Location API
export const locationAPI = {
  update: (data: { latitude: number; longitude: number }) => api.post('/location/update', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getDriverPayments: () => api.get('/dashboard/admin/driver-payments'),
};

export default api;
