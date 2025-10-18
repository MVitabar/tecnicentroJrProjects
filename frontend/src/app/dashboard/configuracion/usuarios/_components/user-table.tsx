"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users as UsersIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { UserDialog } from "./user-dialog";

type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
};

interface UserTableProps {
  searchTerm?: string;
  roleFilter?: string;
  onSearchChange?: (search: string) => void;
  onRoleFilterChange?: (role: string) => void;
}

export function UserTable({ 
  searchTerm = '', 
  roleFilter = 'all',
  onSearchChange,
  onRoleFilterChange 
}: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleSuccess = async () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    await fetchUsers(); // Refresh the user list
  };

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem(
        process.env.NEXT_PUBLIC_TOKEN_KEY || "auth_token"
      );
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/users`;
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "No se pudieron cargar los usuarios"
        );
      }

      const data = await response.json();
      setUsers(data.items || data); // Handle both paginated and non-paginated responses
      setError(null);
      setCurrentPage(1); // Reset to first page on new search/filter
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(errorMessage);
      toast.error(`Error al cargar los usuarios: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleBadge = (role: string) => {
    const roleMap = {
      ADMIN: {
        label: "Administrador",
        variant:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      },
      USER: {
        label: "Usuario",
        variant:
          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      },
    };

    const { label, variant } = roleMap[role as keyof typeof roleMap] || {
      label: role,
      variant: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    return <Badge className={variant}>{label}</Badge>;
  };


  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      return;
    }

    try {
      const token = localStorage.getItem(
        process.env.NEXT_PUBLIC_TOKEN_KEY || "auth_token"
      );
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar el usuario");
      }

      // Refresh the user list
      await fetchUsers();
      toast.success("¡Usuario eliminado correctamente!");
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar el usuario";
      toast.error(`Error al eliminar el usuario: ${errorMessage}`);
    }
  };

  // Loading state with skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error al cargar los usuarios
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={fetchUsers}
                className="border-red-200 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state with search results
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">
          {searchTerm || roleFilter !== 'all' 
            ? 'No se encontraron usuarios que coincidan con la búsqueda' 
            : 'No hay usuarios registrados'}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {searchTerm || roleFilter !== 'all'
            ? 'Intenta con otros términos de búsqueda o ajusta los filtros.'
            : 'Comienza agregando un nuevo usuario al sistema.'}
        </p>
        <div className="flex space-x-3">
          {(searchTerm || roleFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (onSearchChange) onSearchChange('');
                if (onRoleFilterChange) onRoleFilterChange('all');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[200px]">Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="w-[120px]">Rol</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Creado</TableHead>
              <TableHead className="hidden xl:table-cell">Actualizado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {currentUsers.map((user) => (
            <TableRow key={user.id} className="group hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="max-w-[200px] truncate" title={user.email}>
                  {user.email}
                </div>
              </TableCell>
              <TableCell>{getRoleBadge(user.role)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {user.phone ? (
                  <a 
                    href={`tel:${user.phone}`} 
                    className="text-primary hover:underline"
                    title={`Llamar a ${user.name}`}
                  >
                    {user.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="text-sm text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString('es-ES')}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditClick(user)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    title="Editar usuario"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive/90 opacity-0 group-hover:opacity-100"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-muted-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-muted-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, users.length)}
                </span>{' '}
                de <span className="font-medium">{users.length}</span> usuarios
              </p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Siguiente página</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <UserDialog 
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
          setIsDialogOpen(open);
        }}
        user={editingUser || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
