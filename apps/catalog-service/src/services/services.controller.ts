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
  async findServices(@Payload() payload: any) {
    return this.servicesService.findServices(payload.providerId, payload);
  }

  @MessagePattern({ cmd: 'services.findOne' })
  async getServiceDetail(@Payload() payload: { providerId: string; serviceId: string }) {
    return this.servicesService.findOneService(payload.providerId, payload.serviceId);
  }

  @MessagePattern({ cmd: 'get.service.by.id' })
  async getServiceById(@Payload() id: string) {
    // RPC for cross-service validation
    return this.servicesService.getServiceById(id);
  }
}
