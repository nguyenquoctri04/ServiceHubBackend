import { Controller, Get } from '@nestjs/common';
import { ContractServiceService } from '../../contract-service.service';

@Controller('provider/contract')
export class ContractServiceProviderController {
  constructor(private readonly service: ContractServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Contract Management Service',
      actor: 'PROVIDER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
