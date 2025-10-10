import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    /**
     * Crea un nuevo usuario en la base de datos.
     * 
     * Pasos que realiza:
     * 1. Verifica si ya existe un usuario con el mismo correo electrónico y lanza un error si es así.
     * 2. Valida la contraseña con una expresión regular para asegurar que:
     *    - Contenga al menos una letra mayúscula.
     *    - Contenga al menos un número.
     *    - Contenga al menos un carácter especial (*,@,!,#,%,&,?).
     *    - Tenga un mínimo de 6 caracteres.
     *    Si no cumple, lanza un BadRequestException con el mensaje correspondiente.
     * 3. Hashea la contraseña usando bcrypt con 10 salt rounds.
     * 4. Genera un token de verificación único (UUID v4) y valida que sea un UUID válido.
     * 5. Crea el usuario en la base de datos con los campos:
     *    - email, password (hasheada), name, username
     *    - verifyToken: token de verificación
     *    - verifyTokenExpires: fecha de expiración del token (24 horas)
     * 6. Retorna el usuario recién creado.
     */
    async createUser(email: string, password: string, name: string, username: string, phone?: string, birthdate?: Date, language?: string, timezone?: string,) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new BadRequestException('El email ya está registrado');
        }

        // Validar contraseña
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[*@!#%&?])[A-Za-z\d*@!#%&?]{6,}$/;
        // - al menos 1 mayúscula
        // - al menos 1 número
        // - al menos 1 caracter especial (*, @, !, #, %, &, ?)
        // - mínimo 6 caracteres (puedes ajustar)
        if (!passwordRegex.test(password)) {
            throw new BadRequestException(
                'La contraseña debe tener al menos una mayúscula, un número y un caracter especial (*,@,!,#,%,&,?)'
            );
        }

        // Asignar defaults automáticos si no se enviaron
        const finalLanguage = language || 'indeterminado';       // default neutral
        const finalTimezone = timezone || 'UTC';                 // default UTC

        const hashedPassword = await bcrypt.hash(password, 10);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const RegisterToken = crypto.randomUUID();

        if (!uuidRegex.test(RegisterToken)) {
            throw new Error("UUID inválido");
        }

        return this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username,
                phone,
                birthdate,
                language: finalLanguage,
                timezone: finalTimezone,
                verifyToken: RegisterToken,
                verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
    }

    async updatePasswordResetToken(userId: string, token: string, expires: Date) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordResetToken: token,
                passwordResetTokenExpires: expires,
            },
        });
    }

    // Elimina un usuario de la base de datos por su ID
    async deleteUserById(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    // Buscar usuario por token de reseteo
    async findByResetToken(token: string): Promise<User | null> {
        return this.prisma.user.findFirst({
        where: { passwordResetToken: token },
        });
    }

    // Actualizar cualquier campo del usuario
    async update(userId: string, data: Partial<User>): Promise<User> {
        return this.prisma.user.update({
        where: { id: userId },
        data,
        });
    }

    async changePassword(email: string, currentPassword: string, newPassword: string) {
        // 1. Buscar usuario
        const user = await this.findByEmail(email);
        if (!user) return false;

        // 2. Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return false;

        // 3. Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Actualizar password y fecha de cambio
        await this.updatePassword(user.id, hashedPassword);

        return true;
    }

    async updatePassword(userId: string, newPassword: string) {
    return this.prisma.user.update({
        where: { id: userId },
        data: {
        password: newPassword,
        passwordChangedAt: new Date(),
        },
    });
    }
}