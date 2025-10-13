import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { ServiceListResponseDto } from './dto/service-list-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceStatus } from '@prisma/client';

@ApiTags('Servicios')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Crea un nuevo servicio
   * @param req - Objeto de solicitud que contiene el token JWT
   * @param createServiceDto - Datos del servicio a crear
   * @returns El servicio creado
   */
  @Post()
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({
    summary: 'Crear un nuevo servicio',
    description: 'Crea un nuevo servicio en el sistema. Accesible para ADMIN y USER.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Servicio creado exitosamente',
    type: ServiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado. Se requiere autenticación',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tiene permisos para realizar esta acción. Se requiere rol de ADMIN o USER.',
  })
  async create(
    @Request() req: any,
    @Body() createServiceDto: CreateServiceDto
  ): Promise<{ data: ServiceResponseDto }> {
    const userId = req.user.userId;
    const service = await this.serviceService.create(createServiceDto, userId);
    return { data: service };
  }

  /**
   * Obtiene todos los servicios con paginación
   * @param paginationDto - Parámetros de paginación
   * @returns Lista paginada de servicios
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todos los servicios',
    description: 'Retorna una lista paginada de todos los servicios. Solo accesible para ADMIN.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de registros por página (por defecto: 10, máximo: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de servicios obtenida exitosamente',
    type: ServiceListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado. Se requiere autenticación',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tiene permisos para acceder a este recurso. Se requiere rol de ADMIN.',
  })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<ServiceListResponseDto> {
    return this.serviceService.findAll(paginationDto);
  }

  /**
   * Obtiene un servicio por su ID
   * @param id - ID único del servicio
   * @returns El servicio solicitado
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({
    summary: 'Obtener servicio por ID',
    description: 'Retorna los detalles de un servicio específico por su ID. Accesible para ADMIN y USER.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del servicio a consultar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servicio encontrado exitosamente',
    type: ServiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No se encontró el servicio con el ID especificado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado. Se requiere autenticación',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tiene permisos para acceder a este recurso. Se requiere rol de ADMIN o USER.',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ data: ServiceResponseDto }> {
    const service = await this.serviceService.findOne(id);
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return { data: service };
  }

  /**
   * Actualiza un servicio existente
   * @param id - ID del servicio a actualizar
   * @param updateServiceDto - Datos a actualizar del servicio
   * @param req - Objeto de solicitud que contiene el token JWT
   * @returns El servicio actualizado
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({
    summary: 'Actualizar un servicio',
    description: 'Actualiza los datos de un servicio existente. Solo el propietario o un ADMIN pueden actualizar el servicio.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del servicio a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servicio actualizado exitosamente',
    type: ServiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No se encontró el servicio con el ID especificado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tienes permiso para actualizar este servicio',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado. Se requiere autenticación',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdateServiceDto
  ): Promise<{ data: ServiceResponseDto }> {
    const userId = req.user.userId;
    const isAdmin = req.user.role === Role.ADMIN;
    
    // Validar que el estado sea válido si se proporciona
    if (updateServiceDto.status && !Object.values(ServiceStatus).includes(updateServiceDto.status)) {
      throw new BadRequestException('Estado de servicio no válido');
    }
    
    // Si se está marcando como pagado, verificar permisos adicionales
    if (updateServiceDto.paid === true && !isAdmin) {
      throw new ForbiddenException('Solo los administradores pueden marcar servicios como pagados');
    }
    
    const service = await this.serviceService.update(id, updateServiceDto, userId, isAdmin);
    return { data: service };
  }

  /**
   * Obtiene los servicios creados por un usuario específico
   * @param userId - ID del usuario cuyos servicios se desean consultar
   * @param paginationDto - Parámetros de paginación
   * @returns Lista paginada de servicios del usuario
   */
  @Get('user/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener servicios por ID de usuario',
    description: 'Retorna los servicios creados por un usuario específico. Solo accesible para ADMIN.'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario cuyos servicios se desean consultar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de registros por página (por defecto: 10, máximo: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de servicios del usuario obtenida exitosamente',
    type: ServiceListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No se encontró el usuario con el ID especificado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado. Se requiere autenticación',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tiene permisos para acceder a este recurso. Se requiere rol de ADMIN.',
  })
  async findUserServices(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<ServiceListResponseDto> {
    return this.serviceService.findByUserId(userId, paginationDto);
  }
}
