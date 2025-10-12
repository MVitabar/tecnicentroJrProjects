import { 
  BadRequestException, 
  ConflictException, 
  ForbiddenException, 
  Injectable, 
  UnauthorizedException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { EmailValidatorService } from '../common/validators/email-validator.service';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly emailValidator: EmailValidatorService,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.verified) {
      throw new UnauthorizedException('Por favor verifica tu correo electrónico antes de iniciar sesión');
    }

    return user;
  }

  async validateUserByUsername(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el usuario tenga el rol USER
    if (user.role !== Role.USER) {
      throw new UnauthorizedException('Este método de autenticación es solo para usuarios regulares');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // No se requiere verificación de correo electrónico
    // para este método de autenticación

    return user;
  }

  async register(
    email: string,
    password: string,
    name: string,
    username: string,
    phone: string = 'sin_telefono',
    birthdate?: Date,
    language: string = 'es',
    timezone: string = 'UTC'
  ) {
    // Verificar si el correo ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // Verificar si el nombre de usuario ya existe
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    // Validar el formato del correo electrónico
    const isEmailValid = await this.emailValidator.isEmailValid(email);
    if (!isEmailValid) {
      throw new BadRequestException('El correo electrónico no es válido o el dominio no existe');
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear token de verificación
    const verifyToken = randomBytes(32).toString('hex');
    const verifyTokenExpires = new Date();
    verifyTokenExpires.setHours(verifyTokenExpires.getHours() + 24); // Expira en 24 horas

    try {
      // Crear usuario
      const userData: Prisma.UserCreateInput = {
        email,
        password: hashedPassword,
        name,
        username,
        phone,
        birthdate: birthdate || null,
        language,
        timezone,
        verified: false,
        verifyToken,
        verifyTokenExpires,
        role: Role.ADMIN,
        status: 'ACTIVE' as const,
      };

      const newUser = await this.prisma.user.create({ data: userData });

      // Enviar correo de verificación
      await this.mailService.sendVerificationEmail(newUser.email, verifyToken, newUser.name);

      // Programar limpieza si no se verifica
      this.scheduleUserCleanup(newUser.id);

      // No devolver la contraseña
      const { password: _, verifyToken: __, verifyTokenExpires: ___, ...result } = newUser;
      return result;
    } catch (error) {
      console.error('Error en el registro:', error);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al registrar el usuario');
    }
  }

  private scheduleUserCleanup(userId: string) {
    const timeout = setTimeout(async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && !user.verified) {
        await this.prisma.user.deleteMany({
          where: { 
            id: userId,
            verified: false
          },
        });
        console.log(`Usuario no verificado eliminado: ${userId}`);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas

    this.schedulerRegistry.addTimeout(`user-cleanup-${userId}`, timeout);
  }

  // Métodos existentes...
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        verifyToken: token, 
        verifyTokenExpires: { 
          gt: new Date() 
        } 
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: { 
        verified: true, 
        verifyToken: null, 
        verifyTokenExpires: null 
      },
    });
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {      
      return true;
    }

    // Generar token y expiración
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30); // expira en 30 min

    // Guardar token en la base de datos
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordResetToken: token,
        passwordResetTokenExpires: expires
      },
    });

    // Enviar correo de restablecimiento
    await this.mailService.sendPasswordResetEmail(user.email, token);

    return true;
  }

  async resetPassword(token: string, newPassword: string) {
    // 1. Buscar usuario con token
    const user = await this.prisma.user.findFirst({
      where: { 
        passwordResetToken: token,
        passwordResetTokenExpires: { gt: new Date() }
      },
    });
    
    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // 2. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Actualizar usuario
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
      },
    });

    return true;
  }

  async login(user: any, ipAddress?: string) {
    const payload = { 
      email: user.email, 
      sub: user.id,
      role: user.role 
    };

    // Actualizar la última hora de inicio de sesión
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        ...(ipAddress && { lastLoginIp: ipAddress })
      },
    });

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified
      }
    };
  }

  async refreshToken(refreshToken: string, ipAddress: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const newPayload = { 
        email: user.email, 
        sub: user.id,
        role: user.role 
      };

      return {
        access_token: this.jwtService.sign(newPayload),
        refresh_token: this.jwtService.sign(newPayload, { expiresIn: '7d' })
      };
    } catch (error) {
      throw new UnauthorizedException('Token de actualización inválido o expirado');
    }
  }
}
