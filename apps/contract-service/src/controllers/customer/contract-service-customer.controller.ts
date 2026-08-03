import { Controller, Get } from '@nestjs/common';
import { ContractServiceService } from '../../contract-service.service';

@Controller('customer/contract')
export class ContractServiceCustomerController {
  constructor(private readonly service: ContractServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Contract Management Service',
      actor: 'CUSTOMER',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
