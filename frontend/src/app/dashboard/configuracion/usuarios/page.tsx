'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Search, X } from 'lucide-react';
import { UserTable } from './_components/user-table';
import { UserDialog } from './_components/user-dialog';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const handleUserCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger refresh with new search term
    setRefreshKey(prev => prev + 1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    // Trigger refresh to show all users
    setRefreshKey(prev => prev + 1);
  };

  const hasActiveFilters = searchTerm || roleFilter !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Gestión de Usuarios"
              description="Administra los usuarios del sistema"
              className="mb-0"
            />
            <UserDialog onSuccess={handleUserCreated}>
              <Button className="whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </UserDialog>
          </div>
          
          <div className="flex flex-col space-y-3 pt-2">
            <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="outline" className="shrink-0">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </form>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Filtrar por:</span>
                <Tabs 
                  value={roleFilter} 
                  onValueChange={setRoleFilter}
                  className="inline-flex"
                >
                  <TabsList className="h-8 p-0.5">
                    <TabsTrigger value="all" className="text-xs px-3">
                      Todos
                    </TabsTrigger>
                    <TabsTrigger value="ADMIN" className="text-xs px-3">
                      Administradores
                    </TabsTrigger>
                    <TabsTrigger value="USER" className="text-xs px-3">
                      Usuarios
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <Card className="overflow-hidden">
          <UserTable 
            key={refreshKey} 
            searchTerm={searchTerm} 
            roleFilter={roleFilter} 
          />
        </Card>
      </div>
    </div>
  );
}
