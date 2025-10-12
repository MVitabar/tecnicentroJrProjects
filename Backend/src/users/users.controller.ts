import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateSimpleUserDto } from '../auth/dto/create-simple-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

// Función para generar el nombre de usuario automático
const generateUsername = (): string => {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');
  return `user${timestamp}`;
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private readonly logger = new Logger(UsersController.name);

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Crear nuevo usuario',
    description: 'Crea un nuevo usuario con los datos proporcionados. El username se generará automáticamente si no se especifica.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico o teléfono ya está en uso',
  })
  async createUser(@Body() createUserDto: CreateSimpleUserDto) {
    this.logger.debug('Iniciando creación de usuario');
    this.logger.debug(`Datos recibidos: ${JSON.stringify(createUserDto)}`);

    // Generar username automáticamente si no se proporciona
    const username = createUserDto.username || generateUsername();
    this.logger.debug(`Username generado: ${username}`);

    // Validar que el email esté presente
    if (!createUserDto.email) {
      this.logger.error('El correo electrónico es obligatorio');
      throw new Error('El correo electrónico es obligatorio');
    }

    // Preparar los datos del usuario
    const userData = {
      name: createUserDto.name,
      username,
      password: createUserDto.password,
      email: createUserDto.email, // Ya validado que no es undefined
      phone: createUserDto.phone || 'sin_telefono',
      role: Role.USER, // Siempre será USER en este controlador
      language: 'es',
      timezone: 'UTC',
      verified: true, // Usuario verificado por defecto
    };

    this.logger.debug(`Datos del usuario a crear: ${JSON.stringify({...userData, password: '***'})}`);
    
    try {
      const user = await this.usersService.create(userData);
      this.logger.debug(`Usuario creado exitosamente con ID: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack);
      throw error;
    }
  }
}
