import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username: string;

  @ApiProperty({ example: 'anypassword' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: '+66812345678', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
