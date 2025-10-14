// src/services/dashboard.service.ts
// import axios from 'axios';

// // Define API base URL from environment variables
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tecnicentrojrbackend-production.up.railway.app';

// Create axios instance
// const api = axios.create({
//   baseURL: API_URL,
//   withCredentials: true,
// });

// Define response types
// interface Sale {
//   id: string;
//   total: number;
//   customer?: {
//     name: string;
//   };
//   items?: Array<{ id: string; quantity: number; price: number }>;
//   createdAt: string;
// }

// interface Product {
//   id: string;
//   name: string;
//   stock: number;
//   price: number;
//   // Add other product properties as needed
// }

// interface PaginatedResponse<T> {
//   items: T[];
//   meta: {
//     totalItems: number;
//     itemCount: number;
//     itemsPerPage: number;
//     totalPages: number;
//     currentPage: number;
//   };
// }

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

const MOCK_DASHBOARD_STATS: DashboardStats = {
  salesSummary: {
    total: 0,
    count: 0,
    average: 0
  },
  productsSummary: {
    totalProducts: 0,
    lowStockItems: 0
  },
  activeServices: 0,
  totalCustomers: 0,
  recentActivity: []
};

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    // Return mock data immediately
    return new Promise((resolve) => {
      // Simulate a small delay to mimic network request
      setTimeout(() => {
        resolve(MOCK_DASHBOARD_STATS);
      }, 300);
    });
  }
};