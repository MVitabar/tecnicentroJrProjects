import { PageHeader } from '@/components/page-header';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes y preferencias del sistema"
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Personaliza la configuración de tu cuenta y preferencias del sistema.
        </p>
      </div>
    </div>
  );
}
