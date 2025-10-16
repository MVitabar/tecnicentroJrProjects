import { api } from "./api";

export interface OrderItemDto {
  product: {
    id: string;
  };
  quantity: number;
  unitPrice?: number;
  name?: string;
}

export interface CreateOrderDto {
  items: OrderItemDto[];
  paymentMethod?: string;
  clientId?: string | null;
  total: number;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface OrderItem extends OrderItemDto {
  id: string;
  subtotal: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  userId: string;
  totalAmount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
}

export const orderService = {
  async createOrder(orderData: {
    clientInfo: {
      name: string;
      email: string;
      phone: string;
      address?: string;
      dni?: string;
    };
    products: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
    }>;
    services: Array<{
      name: string;
      description: string;
      price: number;
      type: 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'OTHER';
      photoUrls: string[];
    }>;
  }): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      
      // Asegurarse de que products y services sean arrays
      const products = Array.isArray(orderData.products) ? orderData.products : [];
      const services = Array.isArray(orderData.services) ? orderData.services : [];

      // // Calcular totales con valores por defecto
      // const productsTotal = products.reduce((sum, product) => {
      //   const price = product.unitPrice || 0;
      //   return sum + (product.quantity * price);
      // }, 0);

      // const servicesTotal = services.reduce((sum, service) => sum + service.price, 0);

      // Estructura de datos para el backend
      const backendData = {
        clientInfo: orderData.clientInfo || {},
        products: products,
        services: services,
        status: 'PENDING',
      };

      console.group('Sending Order Data to Backend');
      console.log('Endpoint:', 'orders/create');
      console.log('Method:', 'POST');
      console.log('Request Data:', JSON.stringify(backendData, null, 2));
      console.groupEnd();

      const response = await api.post<Order>("orders/create", backendData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      console.group("Order Created Successfully");
      console.log("Response Status:", response.status);
      console.log("Response Data:", response.data);
      console.groupEnd();

      return response.data;
    } catch (error) {
      console.error("Error Creating Order");
      
      if (error instanceof Error) {
        console.error("Error Details:", error.message);
        
        if ('response' in error && error.response) {
          const response = error.response as {
            status?: number;
            data?: unknown;
          };
          
          console.error("Response Status:", response.status);
          console.error("Response Data:", response.data);
        }
      } else {
        console.error("Unknown error occurred:", error);
      }
      
      throw error;
    }
  },

  async getOrders(): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>("orders/all", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener las órdenes:", error);
      throw error;
    }
  },

  async getOrderById(id: string): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order>(`orders/get/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener la orden ${id}:`, error);
      throw error;
    }
  },

  async updateOrder(id: string, updateData: Partial<CreateOrderDto>): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<Order>(`orders/update/${id}`, updateData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar la orden ${id}:`, error);
      throw error;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      const token = localStorage.getItem("auth_token");
      await api.delete(`orders/remove/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error(`Error al eliminar la orden ${id}:`, error);
      throw error;
    }
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>(`orders/user/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener las órdenes del usuario ${userId}:`, error);
      throw error;
    }
  }
};
