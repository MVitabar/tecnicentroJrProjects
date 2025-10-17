import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order } from "@/services/order.service";
import { useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onOrderUpdate?: (order: Order) => void;
}

const statusColors = {
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
} as const;

const statusText = {
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelado',
  IN_PROGRESS: 'En progreso',
  PAID: 'Pagado'
} as const;

export function OrderDetailsDialog({ open, onOpenChange, order: initialOrder }: OrderDetailsDialogProps) {
  const [order] = useState(initialOrder);

  if (!order) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP p", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-lg sm:text-xl">Detalles de la Venta</span>
            <Badge className={statusColors[order.status]}>{statusText[order.status]}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="h-px bg-gray-200 dark:bg-gray-700 mx-6" />
        
        <ScrollArea className="flex-1 px-6 py-2">
          <div className="space-y-6 pb-4">
            {/* Información General */}
            <div className="space-y-2">
              <h3 className="font-medium">Información General</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">ID de la Orden</p>
                  <p className="font-medium">{order.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                </div>
                {order.client && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{order.client.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Productos */}
            {order.orderProducts && order.orderProducts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Productos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Cantidad</th>
                        <th className="text-right p-2">Precio Unit.</th>
                        <th className="text-right p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderProducts.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">
                            <p className="font-medium">
                              {item.product?.name || `Producto ${item.productId.substring(0, 6)}`}
                            </p>
                            {item.product?.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.product.description}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-medium">
                            ${((item.unitPrice || 0) * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/25">
                        <td colSpan={3} className="p-2 text-right font-medium">Total Productos:</td>
                        <td className="p-2 text-right font-medium">
                          ${
                            (order.orderProducts || [])
                              .reduce((sum, item) => sum + ((item.unitPrice || 0) * item.quantity), 0)
                              .toFixed(2)
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Servicios */}
            {order.services && order.services.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">
                  Servicios {order.orderProducts?.length ? 'Adicionales' : ''}
                </h3>
                <div className="space-y-4">
                  {order.services.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <div className="mt-2">
                            <Badge variant="outline" className="mr-2">
                              {service.type === 'REPAIR' ? 'Reparación' : 
                               service.type === 'MAINTENANCE' ? 'Mantenimiento' :
                               service.type === 'DIAGNOSTIC' ? 'Diagnóstico' : 'Otro'}
                            </Badge>
                            <Badge variant="secondary">
                              ${service.price.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        <Badge className={statusColors[service.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                          {statusText[service.status as keyof typeof statusText] || service.status}
                        </Badge>
                      </div>
                      
                      {service.photoUrls && service.photoUrls.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                          {service.photoUrls.map((url, index) => (
                            <a 
                              key={index} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                                <Image
                                  src={url}
                                  alt={`Imagen ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 64px) 100vw, 64px"
                                />
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {order.services.some(s => s.price > 0) && (
                  <div className="text-right font-medium">
                    <p>Total Servicios: $
                      {order.services
                        .reduce((sum, service) => sum + service.price, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resumen Total */}
            {((order.orderProducts && order.orderProducts.length > 0) || (order.services && order.services.length > 0)) && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Total General</h3>
                  <p className="text-lg font-bold">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Información del Cliente */}
            {order.client && (
              <>
                <div className="border-t my-4" />
                <div className="space-y-2">
                  <h3 className="font-medium">Información del Cliente</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Nombre</p>
                      <p className="font-medium">{order.client.name}</p>
                    </div>
                    {order.client.email && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{order.client.email}</p>
                      </div>
                    )}
                    {order.client.phone && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{order.client.phone}</p>
                      </div>
                    )}
                    {order.client.address && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Dirección</p>
                        <p className="font-medium">{order.client.address}</p>
                      </div>
                    )}
                    {(order.client.dni || order.client.ruc) && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {order.client.ruc ? 'RUC' : 'DNI'}
                        </p>
                        <p className="font-medium">{order.client.ruc || order.client.dni}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
