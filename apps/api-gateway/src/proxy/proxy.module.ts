import { Global, Module } from '@nestjs/common';
import { GatewayProxyService } from './gateway-proxy.service';

@Global()
@Module({
  providers: [GatewayProxyService],
  exports: [GatewayProxyService],
})
export class ProxyModule {}
