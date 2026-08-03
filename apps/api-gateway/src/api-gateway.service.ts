import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiGatewayService {
  getWelcomeMessage(): string {
    return 'Welcome to ServiceHub API Gateway!';
  }
}
