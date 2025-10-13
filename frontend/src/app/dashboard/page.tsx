import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Control"
        description="Bienvenido al panel de administración de Tecnicentro JR"
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Tarjeta de Resumen de Ventas */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Ventas del Mes</h3>
          <p className="text-2xl font-bold">$24,780.00</p>
          <p className="text-sm text-muted-foreground">+12% respecto al mes anterior</p>
        </div>

        {/* Tarjeta de Productos */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Productos en Stock</h3>
          <p className="text-2xl font-bold">1,245</p>
          <p className="text-sm text-muted-foreground">+24 productos este mes</p>
        </div>

        {/* Tarjeta de Servicios */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Servicios Activos</h3>
          <p className="text-2xl font-bold">42</p>
          <p className="text-sm text-muted-foreground">+5 en progreso</p>
        </div>

        {/* Tarjeta de Clientes */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Clientes Registrados</h3>
          <p className="text-2xl font-bold">1,234</p>
          <p className="text-sm text-muted-foreground">+48 este mes</p>
        </div>
      </div>

      {/* Gráfico de Ventas */}
      <div className="mt-8 rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Ventas Mensuales</h3>
        <div className="h-64 rounded-md bg-muted/50 flex items-center justify-center">
          <p className="text-muted-foreground">Gráfico de ventas se mostrará aquí</p>
        </div>
      </div>

      {/* Últimos Movimientos */}
      <div className="mt-8">
        <h3 className="mb-4 text-lg font-medium">Actividad Reciente</h3>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="font-medium">Venta #100{i}</p>
                    <p className="text-sm text-muted-foreground">Cliente {i} • Hace {i} hora{i !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(i * 125.5).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{i} producto{i !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
