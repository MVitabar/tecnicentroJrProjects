'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Define the role type and schema
const UserRole = z.enum(['ADMIN', 'USER']);
type UserRoleType = z.infer<typeof UserRole>;

const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  username: z.string().min(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres.',
  }),
  email: z.string().email({
    message: 'Por favor ingresa un correo electrónico válido.',
  }),
  phone: z.string().min(8, {
    message: 'El número de teléfono debe tener al menos 8 dígitos.',
  }),
  role: UserRole,
  password: z.string().min(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  }).optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  // Only validate password if it's provided
  if (data.password && data.password.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La contraseña debe tener al menos 6 caracteres.',
      path: ['password']
    });
  }
  
  // Validate password confirmation if password is provided
  if (data.password && data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Las contraseñas no coinciden.',
      path: ['confirmPassword']
    });
  }
  
  // Require password for new users
  if (!data.id && !data.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La contraseña es requerida',
      path: ['password']
    });
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  onSuccess?: () => void;
  initialData?: Omit<UserFormValues, 'password' | 'confirmPassword'> & { 
    id?: string;
    password?: string;
  };
}

export function UserForm({ onSuccess, initialData }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: (initialData?.role as UserRoleType) || 'USER',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (initialData?.id) {
        // Actualizar usuario existente
        const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            role: data.role,
            ...(data.password && { password: data.password }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al actualizar el usuario');
        }
      } else {
        // Crear nuevo usuario
        if (!data.password) {
          throw new Error('La contraseña es requerida');
        }

        const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
        
        // Definimos los endpoints según el tipo de usuario
        const isAdmin = data.role === 'ADMIN';
        const endpoint = isAdmin ? '/auth/register' : '/users/create';
        
        // Preparamos los datos del usuario
        const userData = isAdmin 
          ? {
              name: data.name,
              username: data.username,  // Agregado username requerido
              email: data.email,
              password: data.password,
              phone: data.phone
              // No incluimos el role ya que el endpoint no lo acepta
              // El backend debe manejar la asignación de rol para este endpoint
            }
          : {
              name: data.name,
              username: data.username,
              email: data.email,
              phone: data.phone,
              password: data.password
              // No incluimos el rol para usuarios regulares
            };

        console.log(`Creando usuario ${isAdmin ? 'ADMIN' : 'regular'} con datos:`, userData);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          let errorMessage = 'Error al crear el usuario';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Si no se puede parsear como JSON, usamos el texto del error
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
      }
      
      toast.success(initialData ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      onSuccess?.();
    } catch (error) {
      console.error('Error al guardar el usuario:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del usuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de usuario</FormLabel>
                <FormControl>
                  <Input placeholder="nombredeusuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+51 987 654 321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
