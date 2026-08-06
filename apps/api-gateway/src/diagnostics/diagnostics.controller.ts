import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@app/common';

@Controller('api/diagnostics')
export class DiagnosticsController {
  constructor(
    @Inject('PROVIDER_SERVICE') private readonly providerClient: ClientProxy,
  ) {}

  @Get('e2e-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER', 'ADMIN')
  async runE2ETest(@CurrentUser() user: any) {
    // 1. Gateway has verified the JWT token statelessly.
    // 2. Gateway sends command to Provider Service via Redis.
    const result = await firstValueFrom(
      this.providerClient.send({ cmd: 'test.ping' }, { userId: user.id, email: user.email }).pipe(
        catchError(err => throwError(() => err))
      )
    );

    return {
      message: 'Architecture E2E Test Completed Successfully',
      user: user,
      downstreamResponse: result
    };
  }
}
