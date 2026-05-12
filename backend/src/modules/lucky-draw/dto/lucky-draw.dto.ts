import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLuckyDrawConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerSpin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxSpinsPerDay?: number;
}

export class SlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rewardAmount: number;

  @ApiProperty({ description: 'Probability weight — higher means more likely' })
  @IsNumber()
  @Min(1)
  weight: number;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  position: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class SaveSlotsDto {
  @ApiProperty({ type: [SlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}
