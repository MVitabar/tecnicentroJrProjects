import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateSimpleUserDto } from 'src/auth/dto/create-simple-user.dto';

export class UpdateUserDto extends PartialType(CreateSimpleUserDto) {
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;
}