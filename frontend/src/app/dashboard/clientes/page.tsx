import { PageHeader } from '@/components/page-header';

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra la información de tus clientes"
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Administra el registro de clientes, incluyendo su información de contacto e historial de compras.
        </p>
      </div>
    </div>
  );
}
