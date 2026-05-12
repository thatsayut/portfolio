import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RewardRuleDto {
  @ApiProperty({ example: 7 })
  @IsNumber()
  @Min(1)
  streakDay: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  rewardAmount: number;

  @ApiProperty({ example: 2.0, description: 'Bonus multiplier on top of base reward' })
  @IsNumber()
  @Min(1)
  bonusMultiplier: number;

  @ApiPropertyOptional({ example: 'Weekly Jackpot' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateCheckinConfigDto {
  @ApiProperty({ example: 'Default Reward Config' })
  @IsString()
  name: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  baseRewardAmount: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  resetOnMissedDay: boolean;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  maxStreakDay: number;

  @ApiPropertyOptional({ type: [RewardRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardRuleDto)
  rules?: RewardRuleDto[];
}
