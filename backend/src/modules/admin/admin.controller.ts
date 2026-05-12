import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateCheckinConfigDto } from '../reward/dto/update-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/types/pagination.types';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SetStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

class SetRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

class AnalyticsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  to?: string;
}

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Platform-wide analytics overview (Admin)' })
  overview() {
    return this.adminService.getOverviewAnalytics();
  }

  @Get('analytics/checkins')
  @ApiOperation({ summary: 'Daily check-in trend analytics (Admin)' })
  checkinAnalytics(@Query() query: AnalyticsQueryDto) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
    const to = query.to ? new Date(query.to) : new Date();
    return this.adminService.getCheckinAnalytics(from, to);
  }

  @Get('analytics/wallet')
  @ApiOperation({ summary: 'Wallet distribution analytics (Admin)' })
  walletAnalytics() {
    return this.adminService.getWalletAnalytics();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters (Admin)' })
  listUsers(@Query() query: PaginationQueryDto & { search?: string; status?: string }) {
    return this.adminService.listUsers({
      page: query.page,
      limit: query.limit,
      search: (query as any).search,
      status: (query as any).status,
    });
  }

  @Put('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user account status (Admin)' })
  setStatus(
    @Param('id') userId: string,
    @Body() dto: SetStatusDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.setUserStatus(adminId, userId, dto.status);
  }

  @Put('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user role (Super Admin only)' })
  setRole(
    @Param('id') userId: string,
    @Body() dto: SetRoleDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.setUserRole(adminId, userId, dto.role);
  }

  @Put('reward/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update check-in reward configuration (Admin)' })
  updateConfig(@Body() dto: UpdateCheckinConfigDto, @CurrentUser('sub') adminId: string) {
    return this.adminService.updateCheckinConfig(adminId, dto);
  }
}
