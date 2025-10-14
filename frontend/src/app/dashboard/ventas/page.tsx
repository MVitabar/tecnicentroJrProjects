"use client";

import { useState, useEffect } from "react";
import { saleService, type Sale } from "@/services/sale.service";
import { productService, type Product } from "@/services/product.service";
import { serviceService, type Service } from "@/services/service.service";
import { SaleForm } from "@/components/sales/sale-form-component";
import { SalesList } from "@/components/sales/sales-list";
import { toast } from "sonner";

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsResponse, servicesResponse] = await Promise.all([
          productService.getProducts(1, 100),
          serviceService.getServices(1, 100, "ACTIVE"),
        ]);
        
        setProducts(productsResponse.data || []);
        setServices(servicesResponse.data || []);
        
        // Cargar ventas existentes
        const salesData = await saleService.getSales();
        setSales(salesData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("No se pudieron cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateSale = async (saleData: { 
    items: Array<{ 
      productId: string; 
      quantity: number;
      price?: number;
      name?: string;
    }>;
    paymentMethod?: string;
  }) => {
    try {
      const newSale = await saleService.createSale({
        ...saleData,
        items: saleData.items.map(item => ({
          ...item,
          price: item.price || 0,
          name: item.name || `Producto ${item.productId}`
        }))
      });
      
      setSales(prevSales => [newSale, ...prevSales]);
      setIsFormOpen(false);
      toast.success("Venta registrada exitosamente");
      return true;
    } catch (error) {
      console.error("Error al crear la venta:", error);
      let errorMessage = "Error al registrar la venta";
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      
      toast.error(errorMessage);
      return false;
    }
  };

  const handleViewSale = (saleId: string) => {
    // Implementar vista detallada de la venta
    console.log("Ver venta:", saleId);
    toast.info(`Visualizando venta ${saleId}`);
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
      

      <SalesList 
        sales={sales} 
        onNewSale={() => setIsFormOpen(true)} 
        onViewSale={handleViewSale} 
      />

      <SaleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateSale}
        products={products}
        services={services}
      />
    </div>
  );
}