import { PageHeader } from '@/components/page-header';

export default function ProductosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Productos"
        description="Administra los productos del inventario"
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Aquí podrás gestionar tu catálogo de productos, incluyendo precios, existencias y categorías.
        </p>
      </div>
    </div>
  );
}
