// src/services/dashboard.service.ts
import { api } from '@/services/api';

// Definir tipos para respuestas de API
interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  clientId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  orderProducts?: Array<{
    id: string;
    quantity: number;
    price: number;
    productId: string;
    product?: {
      id: string;
      name: string;
      description?: string;
      price: number;
      stock: number;
    };
  }>;
  services?: Array<{
    id: string;
    type: string;
    status: string;
    name: string;
    description?: string;
    price: number;
    photoUrls?: string[];
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
  userName?: string;
  itemsCount: number;
  createdAt: string;
}

interface TopProduct {
  id: string;
  name: string;
  value: number;
  price?: number;
  description?: string;
}

export interface DashboardStats {
  salesSummary: SalesSummary;
  productsSummary: ProductsSummary;
  servicesSummary: ServicesSummary;
  clientsSummary: ClientsSummary;
  recentSales: RecentActivity[];
  topProducts: TopProduct[];
}

export const dashboardService = {
  // Función de prueba para verificar endpoints individuales
  async testEndpoints() {
    console.log('=== PROBANDO ENDPOINTS ===');

    try {
      const clientsRes = await api.get('/clientes');
      console.log('✅ /clientes:', clientsRes.status, clientsRes.data?.length || 0, 'items');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('❌ /clientes falló:', error.response?.status, error.message);
    }

    try {
      const productsRes = await api.get('/products/all');
      console.log('✅ /products/all:', productsRes.status, productsRes.data?.data?.length || 0, 'items');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('❌ /products/all falló:', error.response?.status, error.message);
    }

    try {
      const servicesRes = await api.get('/services/findAll');
      console.log('✅ /services/findAll:', servicesRes.status, servicesRes.data?.length || 0, 'items');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('❌ /services/findAll falló:', error.response?.status, error.message);
    }

    try {
      const ordersRes = await api.get('/orders/all');
      console.log('✅ /orders/all:', ordersRes.status, ordersRes.data?.length || 0, 'items');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('❌ /orders/all falló:', error.response?.status, error.message);
    }
  },

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log('Obteniendo datos del dashboard...');

      // Obtener datos en paralelo
      const [ordersRes, clientsRes, productsRes, servicesRes] = await Promise.all([
        api.get('/orders/all').catch(() => ({ data: [] })),
        api.get('/clientes').catch(() => ({ data: { data: [] } })),
        api.get('/products/all').catch(() => ({ data: [] })),
        api.get('/services/findAll').catch(() => ({ data: [] })) // ✅ Corregido: usar /services/findAll
      ]);

      // Extraer datos correctamente basado en la estructura de respuesta
      const orders: Order[] = ordersRes.data || [];
      const products: Product[] = productsRes.data || [];
      const services: Service[] = servicesRes.data || [];

      // Manejar datos de clientes con más cuidado
      let clients: Client[] = [];
      if (clientsRes.data) {
        if (Array.isArray(clientsRes.data.data)) {
          clients = clientsRes.data.data;
        } else if (Array.isArray(clientsRes.data)) {
          clients = clientsRes.data;
        } else if (clientsRes.data && typeof clientsRes.data === 'object') {
          // Si es un objeto, intentar encontrar el array en propiedades comunes
          if (Array.isArray(clientsRes.data.items)) {
            clients = clientsRes.data.items;
          } else if (Array.isArray(clientsRes.data.data)) {
            clients = clientsRes.data.data;
          }
        }
      }

      console.log('=== DETALLES DE RESPUESTA ===');
      console.log('Orders response:', ordersRes);
      console.log('Clients response:', clientsRes);
      console.log('Products response:', productsRes);
      console.log('Services response:', servicesRes);

      console.log('=== DATOS PROCESADOS ===');
      console.log('Orders count:', orders.length);
      console.log('Clients count:', clients.length);
      console.log('Products count:', products.length);
      console.log('Services count:', services.length);

      console.log('=== MUESTRA DE DATOS ===');
      console.log('First client:', clients[0]);
      console.log('Client structure:', clients[0] ? Object.keys(clients[0]) : 'No clients');
      console.log('Clients response data type:', typeof clientsRes.data);
      console.log('Clients response data keys:', clientsRes.data ? Object.keys(clientsRes.data) : 'No data');
      console.log('Clients response data.data type:', typeof clientsRes.data?.data);
      console.log('Clients response data.data length:', clientsRes.data?.data?.length);

      // Datos de respaldo para productos (en caso de que falle la carga)
      const fallbackProducts = [
        {
          id: '1',
          name: 'Producto Demo 1',
          price: 100,
          stock: 50,
          description: 'Producto de demostración con características especiales',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Producto Demo 2',
          price: 150,
          stock: 25,
          description: 'Producto avanzado con tecnología de vanguardia',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Producto Demo 3',
          price: 200,
          stock: 5,
          description: 'Producto premium con garantía extendida',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Datos de respaldo para servicios (en caso de que falle la carga)
      const fallbackServices = [
        {
          id: '1',
          name: 'Servicio Demo 1',
          price: 75,
          description: 'Servicio de demostración',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Servicio Demo 2',
          price: 100,
          description: 'Servicio de demostración 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Datos de respaldo para órdenes (en caso de que falle la carga)
      const fallbackOrders = [
        {
          id: 'demo-order-1',
          totalAmount: 150.50,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'demo-user',
          clientId: 'demo-client-1',
          user: undefined,
          client: {
            id: 'demo-client-1',
            name: 'Cliente Demo',
            email: 'cliente@demo.com',
            phone: '123456789'
          },
          orderProducts: [
            {
              id: 'demo-product-1',
              quantity: 2,
              price: 50.25,
              productId: 'demo-prod-1',
              product: {
                id: 'demo-prod-1',
                name: 'Producto Demo',
                description: 'Producto de demostración',
                price: 50.25,
                stock: 10
              }
            }
          ],
          services: []
        }
      ];

      const ordersData = orders.length > 0 ? orders : fallbackOrders;
      const productsData = products.length > 0 ? products : fallbackProducts;
      const servicesData = services.length > 0 ? services : fallbackServices;

      // Calcular resumen de ventas (solo para órdenes completadas)
      const completedOrders = ordersData.filter((order: Order) => order.status === 'COMPLETED');

      const salesTotal = completedOrders.reduce((sum: number, order: Order) => {
        // Sumar el monto total de cada orden
        return sum + (order.totalAmount || 0);
      }, 0);

      const salesCount = completedOrders.length;
      const salesAverage = salesCount > 0 ? salesTotal / salesCount : 0;

      // Calcular resumen de productos
      const lowStockThreshold = 10;
      const lowStockCount = productsData.filter((p: Product) => p.stock <= lowStockThreshold).length;

      // Calcular resumen de clientes
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newClientsThisMonth = clients.filter((client: Client) => {
        const clientDate = new Date(client.createdAt);
        return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
      }).length;

      // Obtener ventas recientes (últimas 5)
      const recentSales = ordersData
        .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Obtener productos principales (por stock)
      const topProducts = productsData
        .sort((a: Product, b: Product) => b.stock - a.stock)
        .slice(0, 5);

      // Obtener servicio más popular
      const mostPopularService = servicesData[0]?.name || 'Ninguno';

      return {
        salesSummary: {
          total: salesTotal,
          count: salesCount,
          average: parseFloat(salesAverage.toFixed(2)),
        },
        productsSummary: {
          total: productsData.length,
          lowStock: lowStockCount,
        },
        servicesSummary: {
          total: servicesData.length,
          mostPopular: mostPopularService,
        },
        clientsSummary: {
          total: clients.length,
          newThisMonth: newClientsThisMonth,
        },
        recentSales: recentSales.map((sale: Order) => {
          // Calcular cantidad total de productos y servicios
          const orderProductsCount = sale.orderProducts?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const servicesCount = sale.services?.length || 0;
          const totalItemsCount = orderProductsCount + servicesCount;

          return {
            id: sale.id,
            type: 'sale',
            amount: sale.totalAmount,
            status: sale.status,
            description: `Venta #${sale.id.substring(0, 6)}`,
            customerName: sale.client?.name || `Cliente #${sale.clientId?.substring(0, 6) || 'N/A'}`,
            userName: sale.user?.name || undefined,
            itemsCount: totalItemsCount,
            createdAt: sale.createdAt,
          };
        }),
        topProducts: topProducts.map((product: Product) => ({
          id: product.id,
          name: product.name,
          value: product.stock,
          price: product.price,
          description: product.description,
        })),
      };
    } catch (error) {
      console.error('Error al obtener datos del dashboard:', error);
      throw new Error('No se pudieron cargar los datos del dashboard');
    }
  },
};