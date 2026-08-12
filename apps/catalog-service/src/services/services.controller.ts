import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @MessagePattern({ cmd: 'services.create' })
  async createService(
    @Payload() payload: { providerId: string; dto: CreateServiceDto },
  ) {
    return this.servicesService.createService(payload.providerId, payload.dto);
  }

  @MessagePattern({ cmd: 'services.find' })
  async findServices() {
    // Pagination logic can be implemented here later
    return [];
  }

  @MessagePattern({ cmd: 'services.getById' })
  async getServiceById(@Payload() id: string) {
    // RPC for cross-service validation
    return null;
  }
}
