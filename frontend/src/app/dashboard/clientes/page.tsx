'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { clientService } from '@/services/client.service';
import { Client } from '@/types/client.types';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const router = useRouter();
  const { toast } = useToast();

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      if (searchTerm) {
        // Usar el endpoint de búsqueda
        const results = await clientService.searchClients(searchTerm);
        setClients(results);
        setTotalItems(results.length);
        setTotalPages(1);
      } else {
        // Cargar todos los clientes con paginación
        const response = await clientService.getClients(page, limit);
        setClients(response.data);
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.totalItems);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes. Por favor, intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, toast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset a la primera página al buscar
    loadClients();
  };

  // Manejar cambio de página
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', { locale: es });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra la información de tus clientes"
      >
        <Button onClick={() => router.push('/dashboard/clientes/nuevo')}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Lista de Clientes</CardTitle>
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar clientes..."
                className="pl-8 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell className="flex space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : clients.length > 0 ? (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.email && <div className="text-sm">{client.email}</div>}
                          {client.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.dni && <div>DNI: {client.dni}</div>}
                        {client.ruc && <div>RUC: {client.ruc}</div>}
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/dashboard/clientes/editar/${client.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                              if (confirm('¿Está seguro de eliminar este cliente?')) {
                                try {
                                  await clientService.deleteClient(client.id);
                                  toast({
                                    title: 'Cliente eliminado',
                                    description: 'El cliente ha sido eliminado correctamente.',
                                  });
                                  loadClients();
                                } catch (error) {
                                  console.error('Error deleting client:', error);
                                  toast({
                                    title: 'Error',
                                    description: 'No se pudo eliminar el cliente. Por favor, intente nuevamente.',
                                    variant: 'destructive',
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(page * limit, totalItems)}
                </span>{' '}
                de <span className="font-medium">{totalItems}</span> clientes
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
