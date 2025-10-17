'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UserTable } from './_components/user-table';
import { UserDialog } from './_components/user-dialog';

export default function UsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Gestión de Usuarios"
          description="Administra los usuarios del sistema"
        />
        <UserDialog onSuccess={handleUserCreated}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </UserDialog>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <UserTable key={refreshKey} />
      </div>
    </div>
  );
}
