// src/services/product.service.ts
import { api, getApiBaseUrl } from './api';
import { AxiosError } from 'axios';
import { Product, ProductsResponse } from '@/types/product.types';

export const productService = {
  async getProducts(page: number = 1, limit: number = 10, search?: string): Promise<ProductsResponse> {
    try {
      console.log('API Base URL:', getApiBaseUrl());
      const response = await api.get<{ data: Product[]; total: number }>('/products', {
        params: { 
          page, 
          limit, 
          ...(search && { search })
        },
      });
      
      // Transform the response to match our frontend needs
      const transformedResponse: ProductsResponse = {
        data: response.data.data || [],
        total: response.data.total,
        meta: {
          totalItems: response.data.total,
          itemCount: response.data.data?.length || 0,
          itemsPerPage: limit,
          totalPages: Math.ceil((response.data.total || 0) / limit),
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

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy'>) {
    try {
      const response = await api.post<{ data: Product }>('/products', productData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating product:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Error al crear el producto. Por favor, intente nuevamente.';
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