import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/api-gateway/src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);
  
  const token = jwt.sign({
    sub: 'user-1',
    email: 'test@example.com',
    role: 'PROVIDER',
    providerId: 'provider-1'
  }, {
    secret: config.get('JWT_SECRET', 'secret')
  });
  
  console.log(token);
  await app.close();
}
bootstrap();
