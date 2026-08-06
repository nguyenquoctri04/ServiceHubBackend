import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProvidersService } from './providers.service';

@Controller()
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @MessagePattern({ cmd: 'test.ping' })
  async handleTestPing(@Payload() data: any) {
    return this.service.processTestPing(data);
  }
}
