import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BonusService } from './bonus.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/types/pagination.types';

@ApiTags('bonus')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('bonus')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new bonus campaign (Admin)' })
  create(@Body() dto: CreateCampaignDto, @CurrentUser('sub') userId: string) {
    return this.bonusService.createCampaign(dto, userId);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List all bonus campaigns (Admin)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.bonusService.findAll(query.page, query.limit);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details (Admin)' })
  findOne(@Param('id') id: string) {
    return this.bonusService.findById(id);
  }

  @Put('campaigns/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate and queue campaign distribution (Admin)' })
  activate(@Param('id') id: string) {
    return this.bonusService.activateCampaign(id);
  }

  @Put('campaigns/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate campaign (Admin)' })
  deactivate(@Param('id') id: string) {
    return this.bonusService.deactivateCampaign(id);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get distribution queue stats (Admin)' })
  queueStats() {
    return this.bonusService.getQueueStats();
  }
}
