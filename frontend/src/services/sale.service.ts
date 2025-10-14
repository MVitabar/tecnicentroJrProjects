import { api } from './api';

export interface SaleItemDto {
  productId: string;
  quantity: number;
  price?: number;
  name?: string;
}

export interface CreateSaleDto {
  items: SaleItemDto[];
  paymentMethod?: string;
}

export interface SaleItem extends SaleItemDto {
  id: string;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  userId: string;
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export const saleService = {
  async createSale(saleData: CreateSaleDto): Promise<Sale> {
    try {
      const response = await api.post<Sale>('/sales/create', saleData);
      return response.data;
    } catch (error) {
      console.error('Error al crear la venta:', error);
      throw error;
    }
  },

  async getSales(): Promise<Sale[]> {
    try {
      const response = await api.get<Sale[]>('/sales');
      return response.data;
    } catch (error) {
      console.error('Error al obtener las ventas:', error);
      throw error;
    }
  },

  async getSaleById(id: string): Promise<Sale> {
    try {
      const response = await api.get<Sale>(`/sales/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener la venta ${id}:`, error);
      throw error;
    }
  },
};