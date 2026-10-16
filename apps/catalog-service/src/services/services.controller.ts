import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { CatalogPatterns } from '@app/common/constants/catalog.patterns';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_CREATE })
  async createService(
    @Payload() payload: { providerId: string; dto: CreateServiceDto },
  ) {
    return this.servicesService.createService(payload.providerId, payload.dto);
  }

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_FIND })
  async findServices(@Payload() payload: { providerId: string } & ServiceQueryDto) {
    return this.servicesService.findServices(payload.providerId, payload);
  }

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_CATEGORIES_FIND })
  async findCategories() {
    return this.servicesService.findCategories();
  }

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_PRICES_FIND_FOR_PROVIDER })
  async findServicePricesForProvider(@Payload() payload: { providerId: string; priceIds: string[] }) {
    return this.servicesService.findServicePricesForProvider(payload.providerId, payload.priceIds);
  }

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_FIND_ONE })
  async getServiceDetail(@Payload() payload: { providerId: string; serviceId: string }) {
    return this.servicesService.findOneService(payload.providerId, payload.serviceId);
  }

  @MessagePattern({ cmd: CatalogPatterns.SERVICES_UPDATE })
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
