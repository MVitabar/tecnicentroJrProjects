import { Controller, Post, Body, Get, Query, Res, Req, Patch, HttpStatus, Inject, forwardRef, UnauthorizedException, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import type { Response } from 'express';
import geoip from 'geoip-lite';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { TokensDto } from './dto/tokens.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
    constructor(
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,
        private readonly userService: UsersService
    ) {}

    @Post('register')
    @ApiOperation({ summary: 'Registrar nuevo usuario', description: 'Crea una nueva cuenta de usuario' })
    @ApiResponse({ 
        status: 201, 
        description: 'Usuario registrado exitosamente',
        type: CreateUserResponseDto
    })
    @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
    @ApiResponse({ status: 409, description: 'El correo electrónico o nombre de usuario ya está en uso' })
    @ApiBody({ 
        type: CreateUserRequestDto,
        description: 'Datos del nuevo usuario',
        examples: {
            example: {
                value: {
                    email: 'usuario@ejemplo.com',
                    password: 'contraseñaSegura123',
                    name: 'Nombre del Usuario',
                    username: 'nombreusuario',
                    phone: '+1234567890',
                    birthdate: '1990-01-01',
                    language: 'es',
                    timezone: 'America/Mexico_City'
                }
            }
        }
    })
    async register(
        @Req() req,
        @Body() registerDto: CreateUserRequestDto
    ): Promise<CreateUserResponseDto> {
        // Detección de idioma
        let language = registerDto.language;
        if (!language) {
            const acceptLang = req.headers['accept-language'];
            language = acceptLang ? acceptLang.split(',')[0] : 'es';
        }

        // Detección de zona horaria
        let timezone = registerDto.timezone || 'UTC';
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const geo = geoip.lookup(ip as string);
        if (geo && geo.timezone) {
            timezone = geo.timezone;
        }

        // Registrar el usuario
        const user = await this.authService.register(
            registerDto.email,
            registerDto.password,
            registerDto.name,
            registerDto.username,
            registerDto.phone,
            registerDto.birthdate ? new Date(registerDto.birthdate) : undefined,
            language,
            timezone
        );

        // Devolver la respuesta
        const response: CreateUserResponseDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            phone: user.phone,
            verified: user.verified, // Usar la propiedad 'verified' del modelo de usuario
            createdAt: user.createdAt
        };

        return response;
    }
    @Post('refresh')
    @ApiOperation({ summary: 'Refrescar token', description: 'Obtiene un nuevo token de acceso usando un token de actualización' })
    @ApiResponse({ status: 201, description: 'Token refrescado exitosamente', type: TokensDto })
    @ApiResponse({ status: 401, description: 'Token de actualización inválido o expirado' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string' }
            },
            required: ['refreshToken']
        }
    })
    async refreshToken(
        @Req() req,
        @Body('refreshToken') refreshToken: string
    ) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        return this.authService.refreshToken(refreshToken, ipAddress);
    }

    @Post('login')
    @ApiOperation({ summary: 'Iniciar sesión', description: 'Autentica un usuario y devuelve tokens de acceso y actualización' })
    @ApiResponse({ 
        status: 200, 
        description: 'Inicio de sesión exitoso',
        type: TokensDto
    })
    @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta no verificada' })
    async login(
        @Req() req,
        @Body('email') email: string, 
        @Body('password') password: string        
    ) {
        console.log('Iniciando proceso de login para:', email);
        try {
            console.log('Validando credenciales...');
            const user = await this.authService.validateUser(email, password);
            console.log('Usuario validado, obteniendo dirección IP...');
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            console.log('IP detectada:', ipAddress);
            console.log('Iniciando sesión...');
            const tokens = await this.authService.login(user, ipAddress);
            console.log('Login exitoso');
            return tokens;
        } catch (error) {
            console.error('Error en login:', error);
            if (error instanceof UnauthorizedException) {
                console.log('Error de autenticación:', error.message);
                throw error;
            }
            console.error('Error inesperado en login:', error);
            throw new UnauthorizedException('Error al iniciar sesión');
        }
    }

    @Get('verify')
    @ApiOperation({ 
        summary: 'Verificar correo electrónico', 
        description: 'Verifica la dirección de correo electrónico del usuario usando un token de verificación' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Correo electrónico verificado exitosamente',
        content: {
            'text/html': {
                example: '<html><body><h1>Correo verificado exitosamente</h1></body></html>'
            }
        }
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Token de verificación inválido o expirado',
        content: {
            'text/html': {
                example: '<html><body><h1>Error: Token inválido o expirado</h1></body></html>'
            }
        }
    })
    @ApiQuery({ 
        name: 'token', 
        required: true, 
        description: 'Token de verificación enviado por correo electrónico',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    async verifyEmail(
        @Query('token') token: string,
        @Res() res: Response
    ) {
        try {
            const user = await this.authService.verifyEmail(token);
            
            // Redirigir al frontend con mensaje de éxito
            return res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
            
        } catch (error) {
            // Redirigir al frontend con mensaje de error
            return res.redirect(`${process.env.FRONTEND_URL}/verify-email?error=invalid_token`);
        }
    }

    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Cambiar contraseña', 
        description: 'Permite a un usuario autenticado cambiar su contraseña actual' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Contraseña cambiada exitosamente',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Contraseña actualizada exitosamente' }
            }
        }
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Datos de entrada inválidos o la nueva contraseña no cumple con los requisitos',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: { type: 'string', example: 'La nueva contraseña debe ser diferente a la actual' },
                error: { type: 'string', example: 'Bad Request' }
            }
        }
    })
    @ApiResponse({ 
        status: 401, 
        description: 'No autorizado - Token inválido o expirado',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'No autorizado' },
                error: { type: 'string', example: 'Unauthorized' }
            }
        }
    })
    @ApiResponse({ 
        status: 403, 
        description: 'Credenciales actuales incorrectas',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'Credenciales actuales incorrectas' },
                error: { type: 'string', example: 'Forbidden' }
            }
        }
    })
    @ApiBody({ 
        type: ChangePasswordDto,
        description: 'Datos para el cambio de contraseña',
        examples: {
            example: {
                value: {
                    currentPassword: 'contraseñaActual123',
                    newPassword: 'nuevaContraseñaSegura123'
                }
            }
        }
    })
    async changePassword(
        @Req() req: any,
        @Body() changePasswordDto: ChangePasswordDto
    ) {
        const { currentPassword, newPassword } = changePasswordDto;
        const userId = req.user.userId; // Obtenido del token JWT
        
        try {
            // Obtener el usuario actual
            const user = await this.userService.findById(userId);
            if (!user) {
                throw new UnauthorizedException('Usuario no encontrado');
            }

            // Verificar credenciales actuales
            const isValid = await this.authService.validateUser(user.email, currentPassword);
            if (!isValid) {
                throw new ForbiddenException('Credenciales actuales incorrectas');
            }
            
            // Cambiar la contraseña
            await this.userService.changePassword(user.email, currentPassword, newPassword);
            
            return { message: 'Contraseña actualizada exitosamente' };
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('No se pudo cambiar la contraseña');
        }
    }

    @Post('request-password-reset')
    @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña', description: 'Envía un correo electrónico con un enlace para restablecer la contraseña' })
    @ApiResponse({ status: 200, description: 'Si el correo existe, se enviarán instrucciones para restablecer la contraseña' })
    @ApiBody({ 
        type: RequestPasswordResetDto,
        description: 'Correo electrónico del usuario que desea restablecer su contraseña',
        examples: {
            example: {
                value: { email: 'usuario@ejemplo.com' }
            }
        }
    })
    async requestPasswordReset(
        @Body() body: RequestPasswordResetDto
    ) {
        await this.authService.requestPasswordReset(body.email);

        return { message: 'Si el correo existe, recibirás un enlace para resetear tu contraseña, intentalo de nuevo si no recibes nada.' };
    }

    @Patch('reset-password')
    @ApiOperation({ summary: 'Restablecer contraseña', description: 'Restablece la contraseña de un usuario usando un token de restablecimiento' })
    @ApiResponse({ status: 200, description: 'Contraseña restablecida exitosamente' })
    @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
    @ApiBody({ 
        type: ResetPasswordDto,
        description: 'Token de restablecimiento y nueva contraseña',
        examples: {
            example: {
                value: { 
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    newPassword: 'nuevaContraseñaSegura123'
                }
            }
        }
    })
    async resetPassword(@Body() body: ResetPasswordDto) {
        const { token, newPassword } = body;
        const success = await this.authService.resetPassword(token, newPassword);

        if (success) {
            return { message: 'Contraseña restablecida correctamente.' };
        } else {
            return { message: 'No se pudo restablecer la contraseña. El token puede ser inválido o haber expirado.' };
        }
    }
}