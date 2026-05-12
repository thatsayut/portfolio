import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  IsInt,
} from 'class-validator';
import { BonusType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'May 2026 Launch Bonus' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: BonusType })
  @IsEnum(BonusType)
  type: BonusType;

  @ApiProperty({ example: 50, description: 'Coin amount per recipient' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplier?: number;

  @ApiPropertyOptional({ example: 100, description: 'Max recipients. null = all active users' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRecipients?: number;

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
