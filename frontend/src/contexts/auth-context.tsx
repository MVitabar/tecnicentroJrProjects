'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { authService } from '@/services/auth';

export type UserRole = 'USER' | 'ADMIN';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  verified?: boolean;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;  // Changed from UserRole to string to match backend
  verified: boolean;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const logout = useCallback((redirect: boolean = true) => {
    console.log('Logging out...');
    // Limpiar el token del almacenamiento local
    const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
    console.log('Current token before logout:', token);
    
    localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
    
    // Resetear el estado del usuario
    setUser(null);
    setError(null);
    
    if (redirect) {
      // Redirigir a la página de login
      router.push('/login');
      
      // Forzar un recargue completo para limpiar cualquier estado de la aplicación
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [router]);

  // Función para verificar la autenticación
  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
    console.log('Checking auth with token:', token);
    
    if (!token) {
      console.log('No token found, user is not authenticated');
      setLoading(false);
      return;
    }

    try {
      console.log('Decoding token...');
      const decoded = jwtDecode<JwtPayload>(token);
      console.log('Decoded token:', decoded);
      
      const currentTime = Date.now() / 1000;
      const tokenExpiration = decoded.exp || 0;

      console.log('Current time:', new Date(currentTime * 1000));
      console.log('Token expires at:', new Date(tokenExpiration * 1000));

      if (tokenExpiration < currentTime - 5) {
        console.log('Token expired');
        logout(false);
      } else {
        // Verificar que el token tenga la estructura esperada
        if (!decoded.sub || !decoded.email) {
          console.error('Token structure error:', decoded);
          throw new Error('Token inválido: estructura incorrecta');
        }
        
        // Mapear los campos del token al formato de usuario
        const user: User = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || '',
          role: decoded.role || 'USER',
          verified: decoded.verified || false,
          iat: decoded.iat,
          exp: decoded.exp
        };
        
        console.log('User authenticated:', user);
        setUser(user);

        const timeUntilExpire = (tokenExpiration - currentTime) * 1000;
        console.log(`Token will expire in ${Math.floor(timeUntilExpire / 1000)} seconds`);

        if (timeUntilExpire > 0) {
          setTimeout(() => {
            console.log('Checking token expiration...');
            checkAuth();
          }, Math.min(timeUntilExpire, 2147483647));
        }
      }
    } catch (err) {
      console.error('Error al verificar la autenticación:', err);
      logout(false); // No redirigir para evitar bucles
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Verificar token al cargar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    // Validación básica del correo
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      setLoading(false);
      return false;
    }

    try {
      const response = await authService.login({ email, password });
      console.log('AuthService response:', response);
      
      if (!response.access_token) {
        throw new Error('No se recibió un token de acceso en la respuesta');
      }

      localStorage.setItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token', response.access_token);
      
      // Usar el usuario de la respuesta si está disponible
      if (response.user) {
        setUser(response.user);
      }
      
      return true;
      
    } catch (err: unknown) {
      const error = err as { 
        response?: { 
          status?: number;
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      
      // Manejo de errores específicos
      if (error?.response?.status === 401) {
        setError('Correo o contraseña incorrectos');
      } else if (error?.response?.status === 500) {
        setError('Error en el servidor. Por favor, inténtalo de nuevo más tarde.');
      } else if (error?.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error?.message) {
        setError(error.message);
      } else if (error?.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Ocurrió un error inesperado al iniciar sesión');
      }
      
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
