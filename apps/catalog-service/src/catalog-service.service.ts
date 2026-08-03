import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogServiceService {
  getServiceInfo(): string {
    return 'Service Catalog Service is operational';
  }
}
