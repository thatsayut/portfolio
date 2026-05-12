import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LuckyDrawService } from './lucky-draw.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/types/pagination.types';
import { UpdateLuckyDrawConfigDto, SaveSlotsDto } from './dto/lucky-draw.dto';

@ApiTags('lucky-draw')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('lucky-draw')
export class LuckyDrawController {
  constructor(private readonly service: LuckyDrawService) {}

  // ─── User endpoints ────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get wheel configuration and remaining spins' })
  getConfig(@CurrentUser('sub') userId: string) {
    return this.service.getWheelConfig(userId);
  }

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Spin the wheel and receive a reward' })
  spin(@CurrentUser('sub') userId: string) {
    return this.service.spin(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get spin history' })
  getHistory(@CurrentUser('sub') userId: string, @Query() query: PaginationQueryDto) {
    return this.service.getHistory(userId, query.page, query.limit);
  }

  // ─── Admin endpoints ──────────────────────────────────────────

  @Get('admin/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full Lucky Draw config with weights (Admin)' })
  getAdminConfig() {
    return this.service.getAdminConfig();
  }

  @Put('admin/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update Lucky Draw config (Admin)' })
  updateConfig(@Body() dto: UpdateLuckyDrawConfigDto) {
    return this.service.updateAdminConfig(dto);
  }

  @Put('admin/slots')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save all slots (Admin)' })
  saveSlots(@Body() dto: SaveSlotsDto) {
    return this.service.saveSlots(dto.slots);
  }

  @Delete('admin/slots/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a slot (Admin)' })
  deleteSlot(@Param('id') id: string) {
    return this.service.deleteSlot(id);
  }
}
