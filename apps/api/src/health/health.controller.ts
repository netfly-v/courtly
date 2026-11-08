import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators.js';
import { errorResponse } from '../common/api-error.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthResponseDto } from './health-response.dto.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Check that the API and the database are up',
    description: 'Public, no login needed. Answers 503 when the database is not reachable.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse(
    errorResponse(503, 'SERVICE_UNAVAILABLE', 'Database is not reachable')
  )
  async checkHealth(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return { status: 'ok' };
  }
}
