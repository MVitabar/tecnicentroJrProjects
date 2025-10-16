"use client";

import { useCallback, useEffect, useState } from "react";
import { serviceService, Service } from "@/services/service.service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { ServiceDetailsModal } from "@/components/service/ServiceDetailsModal";

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadServices = useCallback(async (search: string = "") => {
    try {
      setLoading(true);
      const data = await serviceService.getServicesWithClients(
        undefined,
        search
      );
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServices(searchTerm);
  };

  const handleStatusUpdate = () => {
    loadServices(searchTerm);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: es });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const translateStatus = (status?: string) => {
    if (!status) return "No especificado";

    const statusMap: Record<string, string> = {
      COMPLETED: "Completado",
      IN_PROGRESS: "En Progreso",
      PENDING: "Pendiente",
      CANCELLED: "Cancelado",
    };
    return statusMap[status] || status;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined) return "$0.00";
    return `$${price.toFixed(2)}`;
  };

  const formatShortId = (id?: string) => {
    if (!id) return "N/A";
    return id.substring(0, 6) + "...";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">
            Lista de servicios realizados a clientes
          </p>
        </div>
        
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle>Servicios</CardTitle>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar servicios..."
                  className="pl-8 w-full md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">
                Buscar
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No se encontraron servicios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow
                        key={service.id}
                        className="cursor-pointer transition-colors hover:bg-accent/50"
                        onClick={() => handleServiceClick(service)}
                      >
                        <TableCell className="font-medium">
                          {formatShortId(service.id)}
                        </TableCell>
                        <TableCell>
                          {service.client?.name || "Cliente no especificado"}
                        </TableCell>
                        <TableCell>{service.name || "Sin nombre"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {service.description || "Sin descripción"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              service.status
                            )}`}
                          >
                            {translateStatus(service.status)}
                          </span>
                        </TableCell>
                        <TableCell>{formatPrice(service.price)}</TableCell>
                        <TableCell>
                          {service.createdAt
                            ? formatDate(service.createdAt)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceClick(service);
                            }}
                          >
                            Ver detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceDetailsModal
        service={selectedService}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusUpdate}
      />
    </div>
  );
}
