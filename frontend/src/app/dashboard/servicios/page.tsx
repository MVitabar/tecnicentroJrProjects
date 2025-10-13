import { PageHeader } from '@/components/page-header';

export default function ServiciosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Servicios"
        description="Administra los servicios ofrecidos"
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Gestiona los servicios que ofreces a tus clientes, incluyendo precios y descripciones.
        </p>
      </div>
    </div>
  );
}
