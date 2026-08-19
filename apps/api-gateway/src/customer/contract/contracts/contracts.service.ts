import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    CreateServiceBookingDto
} from "@app/common/dto/customer/contract";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Injectable()
export class CustomerContractsService {
    constructor(
        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async createServiceBooking(
        customerId: string,
        fromEmail: string,
        dto: CreateServiceBookingDto,
    ): Promise<boolean> {
        return this.secureRpc.send<boolean>(
            this.contractClient,
            { cmd: CustomerPatterns.CREATE_SERVICE_BOOKING },
            {
                ...dto,
                customerId,
                fromEmail
            },
        );
    }

    async createServiceRequest(customerId: string, dto: CreateServiceRequestDto) {
        return this.secureRpc.send(
            this.contractClient,
            { cmd: CustomerPatterns.CREATE_SERVICE_REQUEST },
            { customerId, dto },
        );
    }
}
