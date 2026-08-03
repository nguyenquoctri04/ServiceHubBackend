import { Controller, Get } from '@nestjs/common';
import { ContractServiceService } from '../../contract-service.service';

@Controller('admin/contract')
export class ContractServiceAdminController {
  constructor(private readonly service: ContractServiceService) {}

  @Get('status')
  getStatus() {
    return {
      service: 'Contract Management Service',
      actor: 'ADMIN',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
