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
  getAll: (params?: { status?: string; category_id?: string; priority_id?: string; assigned_driver_id?: string }) =>
    api.get('/tasks', { params }),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  complete: (id: string) => api.put(`/tasks/${id}/complete`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data: { name: string; color: string }) => api.post('/categories', data),
  update: (id: string, data: { name: string; color: string }) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Priorities API
export const prioritiesAPI = {
  getAll: () => api.get('/priorities'),
  create: (data: { name: string; level: number; color: string }) => api.post('/priorities', data),
  update: (id: string, data: { name: string; level: number; color: string }) => api.put(`/priorities/${id}`, data),
  delete: (id: string) => api.delete(`/priorities/${id}`),
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
};

export default api;
