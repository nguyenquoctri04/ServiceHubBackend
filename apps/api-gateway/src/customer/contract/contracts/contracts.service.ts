import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from '@app/common';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Injectable()
export class CustomerContractsService {
    constructor(
        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,
        private readonly secureRpc: SecureRpcService,
    ) {}

    async createServiceRequest(customerId: string, dto: CreateServiceRequestDto) {
        return this.secureRpc.send(
            this.contractClient,
            { cmd: CustomerPatterns.CREATE_SERVICE_REQUEST },
            { customerId, dto },
        );
    }
}
