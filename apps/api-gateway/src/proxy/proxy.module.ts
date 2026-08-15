import { Global, Module } from '@nestjs/common';
import { GatewayProxyService } from './gateway-proxy.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [GatewayProxyService],
  exports: [GatewayProxyService],
})
export class ProxyModule {}
