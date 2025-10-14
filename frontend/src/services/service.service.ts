// src/services/service.service.ts
import { api } from './api';
import { AxiosError } from 'axios';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServicesResponse {
  data: Service[];
  total: number;
  meta?: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export const serviceService = {
  async getServices(page: number = 1, limit: number = 100, search?: string): Promise<ServicesResponse> {
    try {
      const response = await api.get<{
        data: Service[];
        total: number;
      }>('/services', {
        params: { 
          page, 
          limit, 
          ...(search && { search })
        },
      });
      
      const items = response.data.data || [];
      const total = response.data.total || 0;
      
      const transformedResponse: ServicesResponse = {
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
      console.error('Error fetching services:', {
        message: axiosError.message,
        config: axiosError.config,
        response: axiosError.response?.data,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudieron cargar los servicios. Por favor, verifique su conexión e intente nuevamente.');
    }
  },

  async getServiceById(id: string): Promise<Service> {
    try {
      const response = await api.get<Service>(`/services/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'No se pudo cargar el servicio. Por favor, intente nuevamente.');
    }
  }
};
