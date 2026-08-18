import { Inject, Injectable, HttpException, NotFoundException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import {
    AccountSettings,
    ProviderCatalogDetailRpcResult,
    ProviderDetail,
    ProviderIdentityDetailRpcResult,
} from "@app/common/dto/customer/identity";

@Injectable()
export class CustomerIdentitiesService {
    constructor(
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    /** GET /api/customer/identity/identities/me — profile + IdentityDocument */
    async getMyProfile(identityId: string) {
        try {
            return await this.secureRpc.send(
                this.identityClient,
                { cmd: "identities.getMyProfile" },
                { id: identityId },
            );
        } catch (err: any) {
            const msg = err?.message || err?.response?.message || "Lỗi lấy thông tin cá nhân";
            const status =
                typeof err?.statusCode === "number" ? err.statusCode
                : typeof err?.status === "number" ? err.status
                : 400;
            throw new HttpException(msg, status);
        }
    }

    /** GET provider detail for public service-detail page */
    async getProviderDetail(
        providerId: string,
        customerId?: string,
    ): Promise<ProviderDetail> {
        console.log(customerId);
        const { blocked } = await this.secureRpc.send<{ blocked: boolean }>(
            this.contractClient,
            { cmd: CustomerPatterns.CHECK_PROVIDER_ACCESS },
            { providerId, customerId },
        );

        if (blocked) {
            throw new NotFoundException("Không tìm thấy nhà cung cấp.");
        }

        let identityResult: ProviderIdentityDetailRpcResult;
        try {
            identityResult =
                await this.secureRpc.send<ProviderIdentityDetailRpcResult>(
                    this.identityClient,
                    { cmd: CustomerPatterns.GET_PROVIDER_DETAIL_FOR_CUSTOMER },
                    { providerId },
                );
        } catch (err: any) {
            throw new NotFoundException(
                err?.message || "Không tìm thấy nhà cung cấp.",
            );
        }

        const catalogResult =
            await this.secureRpc.send<ProviderCatalogDetailRpcResult>(
                this.catalogClient,
                { cmd: CustomerPatterns.GET_PROVIDER_SERVICES_AND_PROPERTIES },
                { providerId, customerId },
            );

        return {
            provider: identityResult.provider,
            services: catalogResult.services,
            properties: catalogResult.properties,
            legalDocuments: identityResult.legalDocuments,
            stats: {
                serviceCount: catalogResult.serviceCount,
                propertyCount: catalogResult.propertyCount,
                verifiedDocumentCount: identityResult.verifiedDocumentCount,
            },
        };
    }

    async getCustomerInformation(customerId: string): Promise<AccountSettings> {
        const [identityInformation, digitalSignature] = await Promise.all([
            this.secureRpc.send(
                this.identityClient,
                { cmd: CustomerPatterns.GET_CUSTOMER_INFORMATION },
                { customerId },
            ),

            this.secureRpc.send(
                this.signatureClient,
                { cmd: CustomerPatterns.GET_DIGITAL_SIGNATURE_IN_SETTING },
                { identityId: customerId },
            ),
        ]);

        return {
            identity: identityInformation.identity,

            personalInfo: identityInformation.personalInfo,

            contactInfo: identityInformation.contactInfo,

            identityVerification: identityInformation.identityVerification,

            digitalSignature,
        };
    }
}
