import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport, ClientsModuleAsyncOptions } from '@nestjs/microservices';

import { parseRedisUrl } from '@app/common';
import { AuthModule } from './auth/auth.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';

const microservices = [
  'IDENTITY_SERVICE',
  'PROVIDER_SERVICE',
  'CATALOG_SERVICE',
  'CUSTOMER_SERVICE',
  'PROPERTY_SERVICE',
  'CONTRACT_SERVICE',
  'SIGNATURE_SERVICE',
  'BILLING_SERVICE',
  'NOTIFICATION_SERVICE',
  'AUDIT_SERVICE',
];

const clientProviders: ClientsModuleAsyncOptions = microservices.map((name) => ({
  name,
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    transport: Transport.REDIS,
    options: parseRedisUrl(configService.get<string>('REDIS_URL')),
  }),
  inject: [ConfigService],
}));

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Monorepo structure, .env is in root
    }),
    ClientsModule.registerAsync(clientProviders),
    AuthModule,
    DiagnosticsModule,
  ],
  controllers: [],
  providers: [],
  exports: [ClientsModule],
})
export class AppModule {}
