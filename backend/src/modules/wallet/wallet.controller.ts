import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/types/pagination.types';

@ApiTags('wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet balance and summary' })
  getWallet(@CurrentUser('sub') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated transaction history' })
  getTransactions(@CurrentUser('sub') userId: string, @Query() query: PaginationQueryDto) {
    return this.walletService.getTransactions({
      userId,
      page: query.page,
      limit: query.limit,
    });
  }
}
