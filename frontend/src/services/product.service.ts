// src/services/product.service.ts
import { api, getApiBaseUrl } from './api';
import { AxiosError } from 'axios';
import { Product, ProductsResponse } from '@/types/product.types';

// La autenticación ahora se maneja a través del token en los headers
// y los datos del usuario se obtienen del localStorage

export const productService = {
  async getProducts(page: number = 1, limit: number = 10, search?: string): Promise<ProductsResponse> {
    try {
      const baseUrl = getApiBaseUrl();
      console.log('Fetching products from:', `${baseUrl}/products/all`);
      
      const response = await api.get<{
        data: Product[];
        total: number;
      }>('/products/all', {
        params: { 
          page, 
          limit, 
          ...(search && { search })
        },
      });
      
      // Transform the response to match our frontend needs
      const items = response.data.data || [];
      const total = response.data.total || 0;
      
      const transformedResponse: ProductsResponse = {
        data: items,
        total: total,
        meta: {
          totalItems: total,
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page
        }
      };
      
      return transformedResponse;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching products:', {
        message: axiosError.message,
        config: axiosError.config,
        response: axiosError.response?.data,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudieron cargar los productos. Por favor, verifique su conexión e intente nuevamente.');
    }
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await api.get<{ data: Product }>(`/products/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw new Error('No se pudo cargar el producto. Por favor, intente nuevamente.');
    }
  },

  async createProduct(productData: Record<string, unknown> | { [key: string]: { value: unknown } } | Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy'>) {
    try {
      // Verificar si estamos en el navegador
      if (typeof window === 'undefined') {
        throw new Error('No se puede acceder al localStorage en el servidor');
      }
      
      // Verificar autenticación
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      // Verificar rol de administrador y obtener datos del usuario
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        throw new Error('No se encontró la información del usuario. Por favor, inicie sesión nuevamente.');
      }
      
      let userData: { id?: string; role?: string; [key: string]: unknown } = {};
      try {
        userData = JSON.parse(userJson);
        if (userData.role !== 'ADMIN') {
          throw new Error('No tienes permisos para crear productos');
        }
      } catch (e) {
        console.error('Error al verificar permisos:', e);
        throw new Error('Error al verificar los permisos. Intente nuevamente.');
      }

      if (!userData.id) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Función para extraer valores de objetos anidados
      const extractValue = (value: unknown): unknown => {
        if (value && typeof value === 'object' && 'value' in value) {
          return (value as { value: unknown }).value;
        }
        return value;
      };

      // Crear objeto con los valores extraídos
      const processedData = {
        name: extractValue((productData as { name?: unknown }).name),
        description: extractValue((productData as { description?: unknown }).description),
        price: extractValue((productData as { price?: unknown }).price),
        stock: extractValue((productData as { stock?: unknown }).stock)
      };

      // Validar y formatear los datos
      const productToSend = {
        name: String(processedData.name || '').trim(),
        description: processedData.description ? String(processedData.description).trim() : undefined,
        price: parseFloat(String(processedData.price || '0').replace(',', '.')),
        stock: processedData.stock !== undefined ? Math.max(0, parseInt(String(processedData.stock), 10)) : 0
      };

      // Validaciones
      if (!productToSend.name) {
        throw new Error('El nombre del producto es requerido');
      }
      
      if (isNaN(productToSend.price) || productToSend.price <= 0) {
        throw new Error('El precio debe ser un número mayor a cero');
      }

      // Log de depuración
      console.log('Datos procesados para enviar:', productToSend);
      
      // Realizar la petición
      const response = await api.post<{ data: Product }>('/products/create', productToSend);
      
      console.log('Producto creado exitosamente:', response.data);
      return response.data.data;
      
    } catch (error: unknown) {
      let errorMessage = 'Error al crear el producto. Por favor, intente nuevamente.';
      
      // Log the error with proper type checking
      if (error instanceof Error) {
        console.error('Error en createProduct:', error.message);
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown, status?: number } };
        console.error('Error en createProduct:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        
        const responseData = axiosError.response?.data;
        if (responseData && typeof responseData === 'object') {
          const data = responseData as Record<string, unknown>;
          const message = data.message as string | undefined;
          const errorDetail = data.error as string | undefined;
          const detail = data.detail as string | undefined;
          const errors = data.errors as Record<string, unknown> | undefined;
          
          if (message) errorMessage = message;
          else if (errorDetail) errorMessage = errorDetail;
          else if (detail) errorMessage = detail;
          else if (errors) {
            errorMessage = Object.entries(errors)
              .map(([key, value]) => 
                `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
              )
              .join('; ');
          }
        }
      } else {
        console.error('Error desconocido en createProduct:', error);
      }
      
      throw new Error(errorMessage);
    }
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy'>>) {
    try {
      const response = await api.put<{ data: Product }>(`/products/${id}`, productData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw new Error('No se pudo actualizar el producto. Por favor, intente nuevamente.');
    }
  },

  async deleteProduct(id: string) {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw new Error('No se pudo eliminar el producto. Por favor, intente nuevamente.');
    }
  },
};