import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import https from 'https';

declare global {
  interface Window {
    refreshTokenTimeout?: NodeJS.Timeout;
    isRefreshing?: boolean;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  name?: string;
  verified?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    verified: boolean;
  };
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Export the axios instance for direct access
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Desactivar verificación SSL en desarrollo
  httpsAgent: process.env.NODE_ENV === 'development' ? new https.Agent({  
    rejectUnauthorized: false
  }) : undefined
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });

    if (error.response?.status === 401) {
      // Only handle token expiration for authenticated routes
      const originalRequest = error.config;
      if (originalRequest.url !== '/auth/login' && 
          originalRequest.url !== '/auth/refresh' &&
          !originalRequest._retry) {
        // If this is a refresh token request that failed, logout
        if (originalRequest.url === '/auth/refresh') {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = '/login';
          }
        } else {
          // Try to refresh the token
          return authService.refreshToken()
            .then(() => {
              // Retry the original request with new token
              const token = getToken();
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              }
              throw new Error('No token available');
            })
            .catch(() => {
              // If refresh fails, redirect to login
              if (typeof window !== 'undefined') {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                window.location.href = '/login';
              }
              return Promise.reject(error);
            });
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to get token from localStorage
export const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Helper function to get token from localStorage
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

// Helper function to get refresh token from localStorage
const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Check if token is expired
export const isTokenExpired = (token?: string): boolean => {
  if (typeof window === 'undefined') return true;
  const tokenToCheck = token || getToken();
  if (!tokenToCheck) return true;
  
  try {
    const decoded = jwtDecode<JwtPayload>(tokenToCheck);
    const currentTime = Date.now() / 1000;
    return (decoded.exp || 0) < currentTime - 5; // 5 second buffer
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Main auth service object with all authentication methods
export const authService = {
  // Expose the axios instance
  api,
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('=== Iniciando proceso de login ===');
      console.log('URL:', `${API_URL}/auth/login`);
      console.log('Credenciales:', { email: credentials.email, password: '***' });

      // Clear any existing auth headers to ensure a clean state
      delete api.defaults.headers.common['Authorization'];
      
      // Make the login request without any auth headers
      const response = await axios.post<AuthResponse>(
        `${API_URL}/auth/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
      
      console.log('=== Respuesta del servidor ===');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Datos de respuesta:', response.data);
      
      const { access_token, refresh_token, user } = response.data;
      
      if (!access_token || !user) {
        throw new Error('Respuesta de autenticación inválida');
      }
      
      // Store tokens and user data
      localStorage.setItem(TOKEN_KEY, access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      // Normalize role format (handle both 'ADMIN'/'USER' and 'Admin'/'User')
      const normalizeRole = (role: string): string => {
        if (!role) return 'User'; // Default role
        const lowerRole = role.toLowerCase();
        if (lowerRole === 'admin' || lowerRole === 'administrator') return 'Admin';
        return 'User'; // Default to 'User' for any other role
      };

      const userWithRole = {
        ...user,
        role: normalizeRole(user.role)
      };
      
      localStorage.setItem(USER_KEY, JSON.stringify(userWithRole));
      
      // Update the default axios instance with the new token
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      }
      
      // Schedule token refresh
      this.scheduleTokenRefresh();
      
      return response.data;
      
    } catch (error) {
      console.error('Error en authService.login:', error);
      this.logout();
      throw error;
    }
  },
  
  // Get current user from localStorage or token
  async getCurrentUser() {
    const token = getToken();
    if (!token) return null;

    try {
      // Try to get user from localStorage first
      const userJson = localStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
      
      // Fallback to decoding token if user not in localStorage
      const decoded = jwtDecode<JwtPayload>(token);
      const userData = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || '',
        role: decoded.role || 'USER',
        verified: decoded.verified || false
      };
      
      // Save to localStorage for future use
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Refresh the access token
  async refreshToken(): Promise<RefreshTokenResponse | null> {
    if (typeof window === 'undefined') return null;
    
    // Prevent multiple refresh attempts
    if (window.isRefreshing) {
      return new Promise<RefreshTokenResponse | null>((resolve) => {
        const checkRefresh = setInterval(() => {
          if (!window.isRefreshing) {
            clearInterval(checkRefresh);
            const token = getToken();
            if (token) {
              resolve({ 
                access_token: token, 
                refresh_token: getRefreshToken() || '', 
                expires_in: 3600 
              });
            } else {
              resolve(null);
            }
          }
        }, 100);
      });
    }
    
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      window.isRefreshing = true;
      
      const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token } = response.data;
      
      // Update tokens
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // Update auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return response.data;
      
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    } finally {
      window.isRefreshing = false;
    }
  },
  
  // Schedule token refresh before expiration
  scheduleTokenRefresh(): void {
    if (typeof window === 'undefined') return;
    
    // Clear any existing timeout
    if (window.refreshTokenTimeout) {
      clearTimeout(window.refreshTokenTimeout);
    }
    
    const token = getToken();
    if (!token) return;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (!decoded.exp) return;
      
      // Refresh 1 minute before expiration
      const expiresIn = (decoded.exp * 1000) - Date.now() - 60000;
      
      if (expiresIn > 0) {
        window.refreshTokenTimeout = setTimeout(() => {
          this.refreshToken().catch(err => {
            console.error('Error refreshing token:', err);
          });
        }, Math.min(expiresIn, 2147483647)); // Max timeout value
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  },
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !isTokenExpired();
  },
  
  // Logout and clear all auth data
  logout(): void {
    if (typeof window === 'undefined') return;
    
    // Clear tokens and user data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Clear any pending refresh
    if (window.refreshTokenTimeout) {
      clearTimeout(window.refreshTokenTimeout);
      delete window.refreshTokenTimeout;
    }
    
    // Clear auth header
    delete api.defaults.headers.common['Authorization'];
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};