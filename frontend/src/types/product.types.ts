// src/types/product.types.ts
export interface User {
  id: string;
  name: string | Record<string, unknown>; // Handle the {} case in the response
  email: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | Record<string, unknown>; // Handle the {} case in the response
  price: number;
  stock: number;
  sku?: string;
  category?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: User;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  meta?: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}