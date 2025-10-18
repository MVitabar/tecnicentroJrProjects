// src/services/dashboard.service.ts
import axios from 'axios';

// Define API base URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Define response types
interface Order {
  id: string;                   // UUID of the order
  totalAmount: number;          // Total amount of the order
  status: string;               // Order status (from SaleStatus enum)
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last update timestamp
  userId: string;               // ID of the user who created the order
  clientId: string;             // ID of the client associated with the order
  orderProducts?: Array<{
    id: string;
    quantity: number;
    price: number;
    // ... other order product fields
  }>;
  services?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    // ... other service fields
  }>;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SalesSummary {
  total: number;
  count: number;
  average: number;
}

interface ProductsSummary {
  total: number;
  lowStock: number;
}

interface ServicesSummary {
  total: number;
  mostPopular: string;
}

interface ClientsSummary {
  total: number;
  newThisMonth: number;
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'service';
  amount: number;
  status: string;
  description: string;
  customerName: string;
  itemsCount: number;
  createdAt: string;
}

interface TopProduct {
  id: string;
  name: string;
  value: number;
}

export interface DashboardStats {
  salesSummary: SalesSummary;
  productsSummary: ProductsSummary;
  servicesSummary: ServicesSummary;
  clientsSummary: ClientsSummary;
  recentSales: RecentActivity[];
  topProducts: TopProduct[];
}

// Helper function to calculate the start and end of the current month
const getCurrentMonthRange = () => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { firstDay, lastDay };
};

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Fetch data in parallel
      const [ordersRes, clientsRes, productsRes, servicesRes] = await Promise.all([
        api.get<Order[]>('/orders/all'),
        api.get<Client[]>('/clientes'),
        api.get<Product[]>('/products/all'),
        api.get<Service[]>('/services/findAll')
      ]);

      // Ensure all responses are arrays
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      const clients = Array.isArray(clientsRes.data) ? clientsRes.data : [];
      const products = Array.isArray(productsRes.data) ? productsRes.data : [];
      const services = Array.isArray(servicesRes.data) ? servicesRes.data : [];
      
      console.log('Fetched data:', { orders, clients, products, services });

      // Calculate sales summary (only for completed orders)
      const completedOrders = orders.filter(order => order.status === 'COMPLETED');
      
      // Calculate total sales including both products and services
      const salesTotal = completedOrders.reduce((sum, order) => {
        // Calculate total from orderProducts
        const productsTotal = order.orderProducts?.reduce(
          (productSum, item) => productSum + (item.price * item.quantity), 0
        ) || 0;
        
        // Calculate total from services
        const servicesTotal = order.services?.reduce(
          (serviceSum, service) => serviceSum + service.price, 0
        ) || 0;
        
        // Return the sum of both, or use order.totalAmount as fallback
        return sum + (productsTotal + servicesTotal || order.totalAmount || 0);
      }, 0);
      
      const salesCount = completedOrders.length;
      const salesAverage = salesCount > 0 ? salesTotal / salesCount : 0;

      // Calculate products summary
      const lowStockThreshold = 10;
      const lowStockCount = products.filter(p => p.stock <= lowStockThreshold).length;

      // Calculate clients summary
      const { firstDay } = getCurrentMonthRange();
      const newClientsThisMonth = Array.isArray(clients) 
        ? clients.filter(client => client && client.createdAt && new Date(client.createdAt) >= firstDay).length 
        : 0;

      // Get recent sales (last 5)
      const recentSales = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Get top products (by stock, but you might want to change this to sales data)
      const topProducts = [...products]
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 5);

      // Get most popular service (for demo, we'll just take the first one)
      const mostPopularService = services[0]?.name || 'Ninguno';

      return {
        salesSummary: {
          total: salesTotal,
          count: salesCount,
          average: parseFloat(salesAverage.toFixed(2)),
        },
        productsSummary: {
          total: products.length,
          lowStock: lowStockCount,
        },
        servicesSummary: {
          total: services.length,
          mostPopular: mostPopularService,
        },
        clientsSummary: {
          total: clients.length,
          newThisMonth: newClientsThisMonth,
        },
        recentSales: recentSales.map(sale => {
          const orderProductsCount = sale.orderProducts?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const servicesCount = sale.services?.length || 0;
          
          return {
            id: sale.id,
            type: 'sale' as const,
            amount: sale.totalAmount,
            status: sale.status,
            description: `Venta #${sale.id.substring(0, 6)}`,
            customerName: `Cliente #${sale.clientId?.substring(0, 6) || 'N/A'}`,
            itemsCount: orderProductsCount + servicesCount,
            createdAt: sale.createdAt,
          };
        }),
        topProducts: topProducts.map(product => ({
          id: product.id,
          name: product.name,
          value: product.stock,
        })),
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('No se pudieron cargar los datos del dashboard');
    }
  },
};