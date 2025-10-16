// sale-form.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saleService, type Sale, type CreateSaleDto } from "@/services/sale.service";
import { productService } from "@/services/product.service";
import { serviceService } from "@/services/service.service";
import { SalesList } from "@/app/dashboard/ventas/sales-list";
import { SaleForm } from "./sale-form-component";
import { Product } from "@/types/product.types";
import { toast } from "sonner";
import type { SaleData, SaleItem } from "@/types/sale.types";
import type { Service } from "@/types/service.types";

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const loadSales = async () => {
    try {
      const salesData = await saleService.getSales();
      setSales(salesData);
    } catch (error) {
      console.error("Error al cargar las ventas:", error);
      toast.error("No se pudieron cargar las ventas");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductsAndServices = async () => {
    try {
      // Get all services (no filters, we'll filter on client side)
      const servicesResponse = await serviceService.getServices();
      // Get all products
      const productsResponse = await productService.getProducts(1, 100);
      
      setProducts(productsResponse.data || []);
      // Filter active services on the client side
      const activeServices = Array.isArray(servicesResponse) 
        ? servicesResponse.filter(service => service.isActive)
        : [];
      setServices(activeServices);
    } catch (error) {
      console.error("Error al cargar productos/servicios:", error);
      toast.error("No se pudieron cargar los productos/servicios");
    }
  };

  useEffect(() => {
    loadSales();
    loadProductsAndServices();
  }, []);

  const handleNewSale = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleCreateSale = async (saleData: SaleData): Promise<boolean> => {
    try {
      const saleDto: CreateSaleDto = {
        items: saleData.items.map((item: SaleItem) => ({
          product: {
            id: item.product.id
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          name: item.name
        })),
        paymentMethod: saleData.paymentMethod || 'CASH',
        clientId: saleData.customer?.documentNumber // Using documentNumber as client ID
      };
      
      const newSale = await saleService.createSale(saleDto);
      setSales(prevSales => [newSale, ...prevSales]);
      toast.success("Venta registrada exitosamente");
      setIsFormOpen(false);
      return true;
    } catch (error) {
      console.error("Error al crear la venta:", error);
      toast.error("Error al registrar la venta");
      return false;
    }
  };

  const handleViewSale = (saleId: string) => {
    console.log("Ver venta:", saleId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl font-semibold text-foreground">
            Gestión de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SalesList
            sales={sales}
            onNewSale={handleNewSale}
            onViewSale={handleViewSale}
          />
        </CardContent>
      </Card>

      <SaleForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleCreateSale}
        products={products}
        services={services}
      />
    </div>
  );
}