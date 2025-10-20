// src/types/sale.types.ts

export interface ProductOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
}
export interface ProductOrder {
  productId: string;
  quantity: number;
  unitPrice?: number;  // Make sure this matches
  name?: string;       // Make sure this matches
  // ... other properties
}

export interface ServiceOrderItem {
  name: string;
  price: number;
  description?: string;
  type?: string;
  photoUrls?: string[];
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
  dni?: string;
  ruc?: string;
  notes?: string;
}

export interface CreateOrderItem {
  product: {
    id: string;
  };
  quantity: number;
  unitPrice: number;
  name?: string;
}

export interface CreateOrderDto {
  items: CreateOrderItem[];
  paymentMethod: string;
  total: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  clientInfo?: ClientInfo;
}

export interface SaleData {
  // New structure
  clientInfo?: ClientInfo;
  products?: ProductOrder[];
  services?: ServiceOrderItem[];
  status?: string;
  paymentMethod?: string;
  total?: number;
  
  // Old structure (for backward compatibility)
  items?: CreateOrderItem[];
  customer?: {
    name?: string;
    phone?: string;
    dni?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
  customerName?: string;
  customerPhone?: string;
  customerDni?: string;
}

// Type guard to check if the data is in the new format
export const isNewSaleData = (data: SaleData): data is Required<Pick<SaleData, 'products' | 'services'>> & {
  clientInfo?: ClientInfo;
  paymentMethod?: string;
  total?: number;
  status?: string;
} => {
  return 'products' in data && 'services' in data;
};

// Tipos para respuestas de órdenes/ventas
export interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  clientId: string;
  orderProducts?: Array<{
    id: string;
    quantity: number;
    price: number;
    productId: string;
  }>;
  services?: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
  }>;
}

export interface OrdersResponse {
  data: Order[];
  total: number;
  meta?: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}