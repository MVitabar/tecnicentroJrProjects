"use client";

import { useState, useEffect, useCallback } from "react";
import { orderService, type Order } from "@/services/order.service";
import { productService, type Product } from "@/services/product.service";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';

type ServiceType = 'REPAIR' | 'MAINTENANCE' | 'DIAGNOSTIC' | 'OTHER';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

export default function VentasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async (search: string = "") => {
    try {
      setLoading(true);
      const productsResponse = await productService.getProducts(1, 100);
      setProducts(productsResponse.data || []);

      const ordersData = await orderService.getOrders();
      // Filtrar órdenes si hay un término de búsqueda
      const filteredOrders = search
        ? ordersData.filter(
            (order) =>
              order.id.toLowerCase().includes(search.toLowerCase()) ||
              order.paymentMethod.toLowerCase().includes(search.toLowerCase())
          )
        : ordersData;

      setOrders(filteredOrders);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchTerm);
  };

  const handleCreateOrder = async (orderData: SaleData) => {
    try {
      console.log('Datos recibidos del formulario:', orderData);
      
      // Asegurarse de que los productos y servicios sean arrays
      const products = Array.isArray(orderData.products) ? orderData.products : [];
      const services = Array.isArray(orderData.services) 
        ? orderData.services as Array<{
            name: string;
            description?: string;
            price: number;
            type?: string;
            photoUrls?: string[];
          }> 
        : [];

      // Función para asegurar que el tipo de servicio sea válido
      const getValidServiceType = (type?: string): ServiceType => {
        const validTypes: ServiceType[] = ['REPAIR', 'MAINTENANCE', 'DIAGNOSTIC', 'OTHER'];
        return validTypes.includes(type as ServiceType) ? type as ServiceType : 'REPAIR';
      };

      // Transformar los datos al formato esperado por el backend
      const orderDataForBackend: {
        clientInfo?: {
          name: string;
          email?: string;
          phone?: string;
          address?: string;
          dni?: string;
          ruc?: string;
        };
        products?: Array<{
          productId: string;
          quantity: number;
        }>;
        services?: Array<{
          name: string;
          description?: string;
          price: number;
          type: 'REPAIR' | 'MAINTENANCE' | 'DIAGNOSTIC' | 'OTHER';
          photoUrls?: string[];
        }>;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAID';
      } = {
        clientInfo: {
          name: orderData.clientInfo?.name || 'Cliente Ocasional',
          ...(orderData.clientInfo?.email && { email: orderData.clientInfo.email }),
          ...(orderData.clientInfo?.phone && { phone: orderData.clientInfo.phone }),
          ...(orderData.clientInfo?.address && { address: orderData.clientInfo.address }),
          ...(orderData.clientInfo?.dni && { dni: orderData.clientInfo.dni }),
          ...(orderData.clientInfo?.ruc && { ruc: orderData.clientInfo.ruc })
        },
        status: 'PENDING' as const
      };

      // Agregar productos si existen
      if (products.length > 0) {
        orderDataForBackend.products = products.map(product => ({
          productId: product.productId,
          quantity: product.quantity || 1
        }));
      }

      // Agregar servicios si existen
      if (services.length > 0) {
        orderDataForBackend.services = services.map(service => ({
          name: service.name || 'Servicio sin nombre',
          ...(service.description && { description: service.description }),
          price: service.price || 0,
          type: getValidServiceType(service.type),
          ...(service.photoUrls && service.photoUrls.length > 0 && { photoUrls: service.photoUrls })
        }));
      }

      console.log('Enviando datos al servicio de órdenes:', orderDataForBackend);
      
      const newOrder = await orderService.createOrder(orderDataForBackend);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      setIsFormOpen(false);
      toast.success('Orden registrada exitosamente');
      return true;
    } catch (error) {
      console.error('Error al crear la orden:', error);
      toast.error(`Error al crear la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  };

  const handleViewOrder = (orderId: string) => {
    console.log("Ver orden:", orderId);
    toast.info(`Visualizando orden ${orderId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle>Ventas</CardTitle>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar ventas..."
                  className="pl-8 w-full md:w-[200px] lg:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">
                Buscar
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {order.createdAt
                          ? format(new Date(order.createdAt), "PP", {
                              locale: es,
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell>{order.paymentMethod}</TableCell>
                      <TableCell className="text-right">
                        ${order.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No se encontraron ventas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SaleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => {
          // Transform the data to match the expected SaleData type
          const transformedData: SaleData = {
            ...data,
            products: data.products.map(p => ({
              ...p,
              
            }))
          };
          return handleCreateOrder(transformedData);
        }}
        products={products}
      />
    </div>
  );
}
