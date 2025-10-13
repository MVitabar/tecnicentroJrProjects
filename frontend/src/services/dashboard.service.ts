// src/services/dashboard.service.ts
import axios from 'axios';

// Define API base URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tecnicentrojrbackend-production.up.railway.app';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Define response types
interface Sale {
  id: string;
  total: number;
  customer?: {
    name: string;
  };
  items?: Array<{ id: string; quantity: number; price: number }>;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  // Add other product properties as needed
}

interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

interface SalesSummary {
  total: number;
  count: number;
  average: number;
}

export interface DashboardStats {
  salesSummary: SalesSummary;
  productsSummary: {
    totalProducts: number;
    lowStockItems: number;
  };
  activeServices: number;
  totalCustomers: number;
  recentActivity: Array<{
    id: string;
    type: 'sale' | 'service';
    amount?: number;
    status?: string;
    description?: string;
    customerName?: string;
    itemsCount?: number;
    createdAt: string;
  }>;
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Make all requests in parallel
      const [
        { data: salesSummary },
        { data: productsRes },
        { data: servicesRes },
        { data: customersRes },
        { data: recentSales }
      ] = await Promise.all([
        api.get<SalesSummary>('/sales/summary'),
        api.get<PaginatedResponse<Product>>('/products?limit=1'),
        api.get<Array<{ id: string; status: string }>>('/services?status=IN_PROGRESS&status=PENDING'),
        api.get<PaginatedResponse<{ id: string }>>('/customers?limit=1'),
        api.get<{ items: Sale[] }>('/sales?limit=5&order=DESC')
      ]);

      // Get products with low stock
      const { data: productsWithStock } = await api.get<PaginatedResponse<Product>>('/products?limit=1000');
      const lowStockItems = productsWithStock.items.filter(
        (p) => p.stock < 10
      ).length;

      // Format recent activity
      const recentActivity = recentSales.items.map((sale) => ({
        id: sale.id,
        type: 'sale' as const,
        amount: sale.total,
        customerName: sale.customer?.name || 'Cliente no especificado',
        itemsCount: sale.items?.length || 0,
        createdAt: sale.createdAt
      }));

      return {
        salesSummary,
        productsSummary: {
          totalProducts: productsRes.meta.totalItems,
          lowStockItems
        },
        activeServices: servicesRes.length,
        totalCustomers: customersRes.meta.totalItems,
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('No se pudieron cargar los datos del dashboard');
    }
  }
};