import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';

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
  async findServices(@Payload() payload: { providerId: string } & ServiceQueryDto) {
    return this.servicesService.findServices(payload.providerId, payload);
  }

  @MessagePattern({ cmd: 'services.categories.find' })
  async findCategories() {
    return this.servicesService.findCategories();
  }

  @MessagePattern({ cmd: 'services.findOne' })
  async getServiceDetail(@Payload() payload: { providerId: string; serviceId: string }) {
    return this.servicesService.findOneService(payload.providerId, payload.serviceId);
  }

  @MessagePattern({ cmd: 'services.update' })
  async updateService(@Payload() payload: { providerId: string; serviceId: string; dto: UpdateServiceDto }) {
    return this.servicesService.updateService(payload.providerId, payload.serviceId, payload.dto);
  }

  @MessagePattern({ cmd: 'get.service.by.id' })
  async getServiceById(@Payload() id: string) {
    // RPC for cross-service validation
    return this.servicesService.getServiceById(id);
  }

  @MessagePattern({ cmd: 'get.service.price.by.id' })
  async getServicePriceById(@Payload() payload: { servicePriceId: string }) {
    return this.servicesService.getServicePriceById(payload.servicePriceId);
  }
}
