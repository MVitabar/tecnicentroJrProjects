import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
        ]);

        if (!requiredRoles) {
        return true;
        }

        // Obtener el usuario del request
        const request = context.switchToHttp().getRequest();
        const user = request.user;  // Debería ser { id: string, email: string, role: Role }

        console.log('Usuario en request:', user);

        // Verificar si el usuario está autenticado y tiene un rol
        if (!user || !user.role) {
            console.log('Usuario no autenticado o sin rol');
            throw new ForbiddenException('No tienes permisos para realizar esta acción');
        }

        // Verificar si el usuario tiene alguno de los roles requeridos
        const hasRole = requiredRoles.some((role) => user.role === role);
        console.log(`Usuario con rol ${user.role} requiere alguno de:`, requiredRoles, '->', hasRole ? 'PERMITIDO' : 'DENEGADO');
        
        if (!hasRole) {
            throw new ForbiddenException(
            `Se requiere uno de estos roles: ${requiredRoles.join(', ')}`
            );
        }

        return true;
        }
}