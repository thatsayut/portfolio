import { Controller, Post, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/types/pagination.types';

@ApiTags('reward')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reward')
export class RewardController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform daily check-in and receive reward' })
  checkin(@CurrentUser('sub') userId: string) {
    return this.checkinService.checkin(userId);
  }

  @Get('checkin/status')
  @ApiOperation({ summary: 'Get today check-in status and current streak' })
  getStatus(@CurrentUser('sub') userId: string) {
    return this.checkinService.getCheckinStatus(userId);
  }

  @Get('checkin/history')
  @ApiOperation({ summary: 'Get paginated check-in history' })
  getHistory(@CurrentUser('sub') userId: string, @Query() query: PaginationQueryDto) {
    return this.checkinService.getHistory(userId, query.page, query.limit);
  }
}
