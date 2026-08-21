import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    CreateServiceBookingDto,
    GetCustomerServicesDto,
} from "@app/common/dto/customer/contract";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerContractsService {
    constructor(
        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async createServiceBooking(
        customerId: string,
        fromEmail: string,
        dto: CreateServiceBookingDto,
    ): Promise<boolean> {
        console.log(dto.servicePriceId);
        return this.secureRpc.send<boolean>(
            this.contractClient,
            { cmd: CustomerPatterns.CREATE_SERVICE_BOOKING },
            {
                ...dto,
                customerId,
                fromEmail,
            },
        );
    }

    async getUsedServices(customerId: string, query: GetCustomerServicesDto) {
        return this.secureRpc.send(
            this.contractClient,
            { cmd: CustomerPatterns.GET_USED_SERVICES },
            {
                customerId,
                status:
                    query.status && query.status !== "ALL"
                        ? query.status
                        : undefined,
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 10,
            },
        );
    }

    async getUsedServiceDetail(customerId: string, contractId: string) {
        return this.secureRpc.send(
            this.contractClient,
            { cmd: CustomerPatterns.GET_USED_SERVICE_DETAIL },
            { customerId, contractId },
        );
    }

    async viewContract(contractId: string, identityId: string) {
        // Ném lỗi ngay tại đây nếu không có quyền hoặc file bị đổi —
        // KHÔNG bao giờ đi tới bước trả pdfUrl trong 2 trường hợp đó.
        const fileInfo = await this.secureRpc.send<{
            contractId: string;
            contractFileId: string;
            pdfUrl: string;
        }>(
            this.contractClient,
            { cmd: CustomerPatterns.GET_CONTRACT_FILE_FOR_VIEWING },
            { contractId, identityId },
        );

        const signatures = await this.secureRpc.send(
            this.signatureClient,
            { cmd: CustomerPatterns.VERIFY_CONTRACT },
            { contractFileId: fileInfo.contractFileId },
        );

        return {
            contractId: fileInfo.contractId,
            pdfUrl: fileInfo.pdfUrl,
            integrityVerified: true, // đã throw ở bước trên nếu không đúng
            signatures,
        };
    }
}
