'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Service } from '@/types/service.types';
import { useState, useEffect } from 'react';
import { serviceService } from '@/services/service.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ServiceDetailsModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

const statusOptions = [
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export function ServiceDetailsModal({ service, isOpen, onClose, onStatusChange }: ServiceDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(service?.status || '');
  const [currentService, setCurrentService] = useState<Service | null>(service);

  useEffect(() => {
    setCurrentService(service);
    if (service) {
      setStatus(service.status);
    }
  }, [service]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleStatusUpdate = async () => {
  if (!currentService) return;
  
  try {
    setIsLoading(true);
    // Ensure the status is in the correct format (uppercase)
    const formattedStatus = status.toUpperCase();
    await serviceService.updateServiceStatus(currentService.id, formattedStatus);
    onStatusChange();
    onClose();
  } catch (error) {
    console.error('Error updating service status:', error);
  } finally {
    setIsLoading(false);
  }
};

  if (!currentService) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles del Servicio</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Cliente</Label>
            <div className="col-span-3">
              <p className="text-sm">{currentService.client?.name || 'No especificado'}</p>
              {currentService.client?.phone && (
                <p className="text-sm text-muted-foreground">
                  Tel: {currentService.client.phone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Servicio</Label>
            <div className="col-span-3">
              <p className="font-medium">{currentService.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentService.type ? currentService.type.replace('_', ' ') : 'Sin tipo'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Label className="text-right font-medium">Descripción</Label>
            <div className="col-span-3">
              <p className="text-sm">
                {currentService.description || 'Sin descripción'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Precio</Label>
            <p className="col-span-3 text-sm">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS'
              }).format(currentService.price)}
            </p>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Fecha de creación</Label>
            <p className="col-span-3 text-sm">
              {formatDate(currentService.createdAt)}
            </p>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Estado</Label>
            <div className="col-span-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={isLoading || status === currentService.status}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}