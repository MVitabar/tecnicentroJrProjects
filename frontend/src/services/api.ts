// src/services/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Ensure the API URL is properly formatted
export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tecnicentrojrbackend-production.up.railway.app';
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
      const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
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
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout. Please check your internet connection.');
    } else if (!error.response) {
      // Network error or CORS issue
      console.error('Network Error. This could be due to one of the following:');
      console.error('1. The server is not running or not accessible');
      console.error('2. CORS is not properly configured on the server');
      console.error('3. There might be a network connectivity issue');
      
      console.error('\nError details:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          withCredentials: error.config?.withCredentials,
        },
      });
      
      // Log CORS-specific information
      if (error.message.includes('CORS')) {
        console.error('\nCORS Issue Detected:');
        console.error('The server needs to be configured to allow requests from:', window.location.origin);
        console.error('Required CORS headers:');
        console.log(`Access-Control-Allow-Origin: ${window.location.origin} or *`);
        console.log('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        console.log('Access-Control-Allow-Headers: Content-Type, Authorization');
        console.log('Access-Control-Allow-Credentials: true');
      }
    } else if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
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