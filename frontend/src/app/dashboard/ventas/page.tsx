"use client";

import { useState, useEffect, useCallback } from "react";
import { orderService, type Order } from "@/services/order.service";
import { productService, type Product } from "@/services/product.service";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';

type ServiceType = 'REPAIR' | 'MAINTENANCE' | 'DIAGNOSTIC' | 'OTHER';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";

export default function VentasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleViewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setIsDetailsOpen(true);
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prevOrders => {
      const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
      
      if (orderExists) {
        // Actualizar orden existente
        return prevOrders.map(order => 
          order.id === updatedOrder.id ? updatedOrder : order
        );
      } else {
        // Si por alguna razón la orden no está en la lista, la agregamos
        return [updatedOrder, ...prevOrders];
      }
    });
    
    // Actualizar la orden seleccionada si es la misma
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    
    // Cerrar el diálogo si se completó la orden
    if (updatedOrder.status === 'COMPLETED') {
      setIsDetailsOpen(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-xl sm:text-2xl">Ventas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administra y revisa el historial de ventas
                </p>
              </div>
              
              <div className="w-full sm:w-auto">
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Nueva Venta</span>
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSearch} className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por ID, cliente o método de pago..."
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 sm:p-6 pt-0">
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[1/8] px-2 text-center">ID</TableHead>
                    <TableHead className="w-[1/8] px-2 text-center">Fecha</TableHead>
                    <TableHead className="min-w-[150px] px-2 text-center">Cliente</TableHead>
                    <TableHead className="w-[1/8] px-2 text-center">Productos</TableHead>
                    <TableHead className="w-[1/8] px-2 text-center">Servicios</TableHead>
                    <TableHead className="w-[1/8] px-2 text-center">Estado</TableHead>
                    <TableHead className="w-[100px] px-2 text-center">Total</TableHead>
                    <TableHead className="w-[60px] px-2 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      
                      const shortDate = order.createdAt
                        ? format(new Date(order.createdAt), 'dd/MM/yy')
                        : 'N/A';
                      
                      const statusColors = {
                        COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                        PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                        CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      };
                      
                      const statusText = {
                        COMPLETED: 'Completado',
                        PENDING: 'Pendiente',
                        CANCELLED: 'Cancelado'
                      };
                        
                      const clientName = order.client?.name || 'Sin cliente';
                      const productCount = order.orderProducts?.length || 0;
                      const serviceCount = order.services?.length || 0;
                      
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="px-2 py-3 text-center">
                            <div className="text-sm font-medium" title={order.id}>
                              {order.id.substring(0, 4)}...
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <div className="flex flex-col">
                              <span className="text-sm">{shortDate}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(order.createdAt), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center ">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate">{clientName}</span>
                              {order.client?.phone && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {order.client.phone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            {productCount > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {productCount} {productCount === 1 ? 'producto' : 'productos'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            {serviceCount > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <span 
                              className={`inline-flex items-center justify-center w-full px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                              title={statusText[order.status]}
                            >
                              {statusText[order.status]}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <span className="text-sm font-medium">
                              ${order.totalAmount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 mx-auto"
                              onClick={() => handleViewOrder(order.id)}
                              title="Ver detalles"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No se encontraron ventas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {orders.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center sm:text-right">
              Mostrando {orders.length} {orders.length === 1 ? 'venta' : 'ventas'}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      <SaleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => {
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
