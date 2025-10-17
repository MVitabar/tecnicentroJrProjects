import api from '@/lib/api/client';

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

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('Iniciando login con credenciales:', { email: credentials.email });
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
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
    
    // Calculate expiration time (current time + expires_in seconds)
    const expiresAt = Date.now() + (authResult.expires_in * 1000);
    
    // Store tokens and expiration
    localStorage.setItem('auth_token', authResult.access_token);
    localStorage.setItem('refresh_token', authResult.refresh_token);
    localStorage.setItem('expires_at', expiresAt.toString());
    
    // Store user data
    const userData = {
      id: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name || '',
      role: authResult.user.role.toUpperCase(),
      verified: authResult.user.verified || false,
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    
    // Clear all auth data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
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

  async refreshToken(): Promise<RefreshTokenResponse | null> {
    if (typeof window === 'undefined') return null;
    
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      const { data } = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken: refreshToken
      });

      // Update stored tokens and expiration
      localStorage.setItem('auth_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      
      const expiresAt = Date.now() + (data.expiresIn * 1000);
      localStorage.setItem('expires_at', expiresAt.toString());

      return data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      return null;
    }
  },
  
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};
