import api from '@/lib/api/client';

declare global {
  interface Window {
    refreshTokenTimeout?: NodeJS.Timeout;
    isRefreshing?: boolean;
  }
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    verified?: boolean;
  };
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Export the auth service as default
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('Iniciando login con credenciales:', { email: credentials.email });
    
    // Clear any existing auth headers
    delete api.defaults.headers.common['Authorization'];
    
    const response = await api.post<AuthResponse>('/auth/login', credentials, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    });
    
    const data = response.data;
    console.log('Respuesta completa del servidor:', JSON.stringify(data, null, 2));
    
    if (!data.access_token) {
      console.error('No access token received in login response');
      throw new Error('No se recibió un token de acceso en la respuesta');
    }
    
    if (!data.user) {
      console.warn('No user data received in login response');
      throw new Error('No se recibieron los datos del usuario en la respuesta');
    }
    
    // Ensure the role is properly set from the API response
    if (!data.user.role) {
      console.warn('No role received in user data, defaulting to USER');
      data.user.role = 'USER';
    } else {
      console.log('Role recibido del servidor:', data.user.role);
    }
    
    // Store tokens and user data
    this.setSession(data);
    
    return data;
  },

  setSession(authResult: AuthResponse): void {
    if (typeof window === 'undefined') return;

    const { access_token, refresh_token, user } = authResult;
    
    // Store tokens and user data
    localStorage.setItem('auth_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }
    
    // Normalize user role
    const userWithRole = {
      ...user,
      role: this.normalizeRole(user.role)
    };
    
    localStorage.setItem('user', JSON.stringify(userWithRole));
    
    // Set default auth header for all future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Set the time that the access token will expire at (with 5 minutes buffer)
    const expiresAt = Date.now() + ((authResult.expires_in - 300) * 1000); // 5 minutes before actual expiration
    localStorage.setItem('expires_at', expiresAt.toString());
    
    // Schedule token refresh
    
    console.log('Sesión establecida correctamente');
    
    // Programar la renovación automática del token
    this.scheduleTokenRefresh();
  },
  
  scheduleTokenRefresh(): void {
    if (typeof window === 'undefined') return;
    
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) return;
    
    const expiresIn = parseInt(expiresAt, 10) - Date.now();
    
    // Si el token expira en menos de 5 minutos, renovarlo
    if (expiresIn <= 0) {
      this.refreshToken();
    } else {
      // Programar la renovación 1 minuto antes de la expiración
      const refreshTime = Math.max(expiresIn - 60000, 1000); // Al menos 1 segundo de espera
      
      // Limpiar cualquier temporizador existente
      if (window.refreshTokenTimeout) {
        clearTimeout(window.refreshTokenTimeout);
      }
      
      window.refreshTokenTimeout = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('Error al renovar el token automáticamente:', error);
        });
      }, refreshTime);
    }
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    
    // Limpiar tokens y datos de usuario
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('user');
    
    // Limpiar temporizadores
    if (window.refreshTokenTimeout) {
      clearTimeout(window.refreshTokenTimeout);
      delete window.refreshTokenTimeout;
    }
    
    // Limpiar bandera de refresco
    if (window.isRefreshing) {
      delete window.isRefreshing;
    }
    
    console.log('Sesión cerrada correctamente');
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },

  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt, 10);
  },
  
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  },

  // Helper to normalize role format
  normalizeRole(role?: string): string {
    if (!role) return 'User';
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'admin' || lowerRole === 'administrator') return 'Admin';
    return 'User';
  },

  // Get current user from localStorage
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async refreshToken(): Promise<RefreshTokenResponse | null> {
    if (typeof window === 'undefined') return null;
    
    // Evitar múltiples intentos de renovación simultáneos
    if (window.isRefreshing) {
      return new Promise<RefreshTokenResponse | null>((resolve) => {
        const checkRefresh = setInterval(() => {
          if (!window.isRefreshing) {
            clearInterval(checkRefresh);
            const token = this.getToken();
            if (token) {
              resolve({ 
                accessToken: token, 
                refreshToken: this.getRefreshToken() || '', 
                expiresIn: 3600 
              });
            } else {
              resolve(null);
            }
          }
        }, 100);
      });
    }
    
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      window.isRefreshing = true;
      
      // Usar fetch directamente para evitar problemas con el interceptor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Actualizar tokens y expiración
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Establecer tiempo de expiración con un margen de 5 minutos
      const expiresAt = Date.now() + ((data.expires_in - 300) * 1000);
      localStorage.setItem('expires_at', expiresAt.toString());
      
      // Actualizar el token en el cliente de API
      if (api.defaults.headers) {
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      }
      
      // Programar próxima renovación
      this.scheduleTokenRefresh();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      return null;
    } finally {
      window.isRefreshing = false;
    }
  },
  
  // Get current user from localStorage
  

};