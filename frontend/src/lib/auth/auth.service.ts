import api from '@/lib/api/client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    verified?: boolean;
  };
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
    
    // Store token with consistent key 'auth_token'
    localStorage.setItem('auth_token', data.access_token);
    
    // Store user data for easy access
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || '',
      role: data.user.role.toUpperCase(), // Ensure role is uppercase
      verified: data.user.verified || false
    };
    
    console.log('Guardando datos del usuario en localStorage:', JSON.stringify(userData, null, 2));
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Verificar lo que se guardó
    const storedUser = localStorage.getItem('user');
    console.log('Datos guardados en localStorage:', storedUser);
    
    return {
      access_token: data.access_token,
      user: userData
    };
  },

  logout(): void {
    // Clear all auth-related data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Add this method to get auth headers for API calls
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
