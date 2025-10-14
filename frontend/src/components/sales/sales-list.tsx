// sales-list.tsx
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Sale } from "@/services/sale.service";
import { cn } from "@/lib/utils";
import React from "react";

// Table components with consistent theming
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-border rounded-lg overflow-hidden shadow-sm">
    <table className="w-full">{children}</table>
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-muted/50">
    {children}
  </thead>
);

const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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

const TableCell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn(
    "px-6 py-4 whitespace-nowrap text-sm text-foreground",
    className
  )}>
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
  sales: Sale[];
  onNewSale: () => void;
  onViewSale: (saleId: string) => void;
};

export function SalesList({ sales, onNewSale, onViewSale }: SalesListProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Ventas</h2>
        <Button 
          type="button" 
          onClick={onNewSale}
          className="whitespace-nowrap"
        >
          Nueva Venta
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow 
                key={sale.id} 
                className="cursor-pointer hover:bg-muted/50" 
                onClick={() => onViewSale(sale.id)}
              >
                <TableCell className="font-medium">{sale.id.substring(0, 8)}...</TableCell>
                <TableCell>{formatDate(sale.createdAt)}</TableCell>
                <TableCell>${sale.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{getStatusBadge(sale.status)}</TableCell>
                <TableCell>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary/90"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onViewSale(sale.id);
                    }}
                  >
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}