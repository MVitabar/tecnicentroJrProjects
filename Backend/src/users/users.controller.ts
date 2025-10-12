import { Controller, Post, Body, UseGuards, Logger, Get, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateSimpleUserDto } from '../auth/dto/create-simple-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserResponseDto } from 'src/auth/dto/create-user-response.dto';
import { generateUsername } from 'src/common/utility/usernameGenerator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private readonly logger = new Logger(UsersController.name);

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear nuevo usuario',
    description: 'Crea un nuevo usuario con los datos proporcionados. El username se generará automáticamente si no se especifica. Requiere rol de ADMIN',
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

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todos los usuarios',
    description: 'Obtiene una lista de todos los usuarios registrados. Requiere rol de ADMIN'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuarios obtenida exitosamente',
    type: [CreateUserResponseDto] // Asegúrate de crear este DTO
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener usuario por ID',
    description: 'Obtiene los detalles de un usuario específico por su ID. Requiere rol de ADMIN'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a buscar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario encontrado',
    type: CreateUserResponseDto
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Actualizar usuario',
    description: 'Actualiza los datos de un usuario existente. Requiere rol de ADMIN'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a actualizar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario actualizado exitosamente',
    type: CreateUserResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El correo electrónico o teléfono ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema. Requiere rol de ADMIN'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario eliminado exitosamente'
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUserById(id);
  }
}
