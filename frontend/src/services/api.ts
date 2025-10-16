// src/services/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Ensure the API URL is properly formatted
export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds timeout
});

// Log the base URL for debugging
console.log('API Base URL:', getApiBaseUrl());

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout. Please check your internet connection.');
    } else if (!error.response) {
      // Network error or CORS issue
      console.error('Network Error. This could be due to one of the following:');
      console.error('1. The server is not running or not accessible');
      console.error('2. CORS is not properly configured on the server');
      console.error('3. You are offline');
      
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        config: {
          url: originalRequest?.url,
          method: originalRequest?.method,
          baseURL: originalRequest?.baseURL,
          withCredentials: originalRequest?.withCredentials,
        },
      });
    } else if (error.response.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined' && !originalRequest?._retry) {
        if (originalRequest) {
          originalRequest._retry = true;
        }
        // Clear auth data and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };

export interface ApiError extends Error {
  response?: {
    data: {
      message?: string;
      error?: string;
      statusCode?: number;
    };
    status: number;
  };
}