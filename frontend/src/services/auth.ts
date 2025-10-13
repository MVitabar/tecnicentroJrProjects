import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import https from 'https';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    verified: boolean;
  };
}

// Configuración global de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      // Manejar token expirado o no válido
      if (typeof window !== 'undefined') {
        localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY!);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('=== Iniciando proceso de login ===');
      console.log('URL:', `${API_URL}/auth/login`);
      console.log('Credenciales:', { ...credentials, password: '***' });
      
      const response = await api.post('/auth/login', credentials);
      
      console.log('=== Respuesta del servidor ===');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Datos de respuesta:', response.data);
      
      if (!response.data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      // Handle both access_token (snake_case) and accessToken (camelCase) for backward compatibility
      const token = response.data.access_token || response.data.accessToken;
      
      if (!token) {
        console.error('No se recibió el token de acceso en la respuesta');
        console.error('Respuesta completa:', response.data);
        throw new Error('No se recibió el token de acceso');
      }

      console.log('Token recibido:', token ? '***' : '(vacío)');
      
      localStorage.setItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token', token);
      
      // Verificar que el token sea válido
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('Token decodificado:', decoded);
        
        // Usar 'sub' como ID del usuario según el estándar JWT
        if (!decoded.sub || !decoded.email) {
          console.error('Token inválido: falta información del usuario', decoded);
          throw new Error('Token inválido: falta información del usuario');
        }

        // Crear un objeto de usuario normalizado con los datos del token
        const userData = {
          ...response.data.user,
          id: decoded.sub,  // Usar 'sub' como ID
          email: decoded.email,
          role: decoded.role || 'USER'  // Valor por defecto si no hay rol
        };

        console.log('Datos del usuario normalizados:', userData);
        return { ...response.data, user: userData };
      } catch (decodeError) {
        console.error('Error al decodificar el token:', decodeError);
        throw new Error('Error al procesar la respuesta de autenticación');
      }
    } catch (error: unknown) {
      console.error('=== Error en authService.login ===');
      
      // Definir tipos para el error de Axios
      interface AxiosErrorResponse {
        status: number;
        data: unknown;
        headers: Record<string, string>;
      }
      
      interface AxiosError extends Error {
        isAxiosError: boolean;
        response?: AxiosErrorResponse;
        request?: XMLHttpRequest;
      }
      
      const axiosError = error as AxiosError;
      
      if (error instanceof Error) {
        console.error('Mensaje de error:', error.message);
      }
      
      if (axiosError.response) {
        // El servidor respondió con un estado fuera del rango 2xx
        const { status, data, headers } = axiosError.response;
        console.error('Estado de respuesta:', status);
        console.error('Datos de error:', data);
        console.error('Cabeceras de respuesta:', headers);
      } else if (axiosError.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        console.error('No se recibió respuesta del servidor');
        console.error('Solicitud:', axiosError.request);
      } else if (error instanceof Error) {
        // Algo sucedió en la configuración de la solicitud
        console.error('Error al configurar la solicitud:', error.message);
      } else {
        console.error('Error desconocido:', error);
      }
      
      throw error; // Re-lanzar el error para que lo maneje el contexto
    }
  },

  async getCurrentUser() {
    const token = typeof window !== 'undefined' ? localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY!) : null;
    if (!token) return null;
    
    const response = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY!);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};