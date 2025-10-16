// sales-list.tsx
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Order } from "@/services/order.service";
import { cn } from "@/lib/utils";
import React from "react";

// Table components with consistent theming
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-border rounded-lg overflow-hidden shadow-sm">
    <table className="w-full">{children}</table>
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-muted/50 border-b border-border">
    {children}
  </thead>
);

const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th 
    scope="col"
    className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
  >
    {children}
  </th>
);

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="bg-card divide-y divide-border">{children}</tbody>
);

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableRow = ({ children, className, ...props }: TableRowProps) => {
  const filteredChildren = React.Children.toArray(children).filter(
    child => typeof child !== 'string' || child.trim() !== ''
  );

  return (
    <tr 
      className={cn(
        "hover:bg-muted/50 transition-colors",
        "border-b border-border last:border-b-0",
        className
      )} 
      {...props}
    >
      {filteredChildren}
    </tr>
  );
};

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

const TableCell = ({ children, className, ...props }: TableCellProps) => (
  <td 
    className={cn(
      "px-6 py-4 whitespace-nowrap text-sm text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </td>
);

const Badge = ({ 
  children, 
  className,
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'default' | 'outline';
}) => (
  <span className={cn(
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    variant === 'default' 
      ? "bg-primary/10 text-primary" 
      : "bg-background border border-border text-foreground",
    className
  )}>
    {children}
  </span>
);

type SalesListProps = {
  sales: Order[];
  onNewSale: () => void;
  onViewSale: (orderId: string) => void;
};

export function SalesList({ sales, onNewSale, onViewSale }: SalesListProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPPp", { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPaymentMethod = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'TRANSFER':
        return 'Transferencia';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historial de Órdenes</h2>
        <Button onClick={onNewSale}>
          Nueva Orden
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No se encontraron ventas registradas
              </TableCell>
            </TableRow>
          ) : (
            <>
            {sales.map((order) => (
              <TableRow key={order.id}>
                <TableCell>#{order.id.slice(0, 8)}</TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="text-sm">
                        {item.name || `Producto ${item.id.slice(0, 4)}`} × {item.quantity}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{order.items.length - 2} más
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getPaymentMethod(order.paymentMethod)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={order.status === 'COMPLETED' ? 'default' : 'outline'}
                    className={cn(
                      order.status === 'COMPLETED' && 'bg-green-100 text-green-800',
                      order.status === 'PENDING' && 'bg-yellow-100 text-yellow-800',
                      order.status === 'CANCELLED' && 'bg-red-100 text-red-800'
                    )}
                  >
                    {getStatusBadge(order.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewSale(order.id)}
                  >
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}