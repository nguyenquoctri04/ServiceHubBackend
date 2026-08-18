import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServiceDetailProvider } from "@app/common/dto/customer/catalog";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class CustomerIdentitiesService {
    constructor(private readonly prisma: PrismaService) {}

    async getProvidersInPopularByIds(providerIds: string[]) {
        const providers = await this.prisma.provider.findMany({
            where: {
                id: {
                    in: providerIds,
                },
                status: "ACTIVE",
                identity: {
                    status: "ACTIVE",
                },
            },
            select: {
                id: true,
                providerName: true,
                logoUrl: true,
            },
        });

        return providers;
    }

    async getSummaryProviders(
        providerIds: string[],
    ): Promise<ServiceDetailProvider[]> {
        if (!providerIds.length) {
            return [];
        }

        const providers = await this.prisma.provider.findMany({
            where: {
                id: {
                    in: providerIds,
                },
            },
            select: {
                id: true,
                providerName: true,
                logoUrl: true,
                description: true,
                businessType: true,
                companyName: true,
                address: true,
                website: true,
            },
        });

        return providers;
    }

    async getProviderDetailForCustomer(providerId: string) {
        const provider = await this.prisma.provider.findFirst({
            where: { id: providerId, status: "ACTIVE" },
            include: { identity: { select: { isEkycVerified: true } } },
        });

        if (!provider) {
            throw new RpcException(
                new NotFoundException("Không tìm thấy nhà cung cấp."),
            );
        }

        const legalDocuments = await this.prisma.providerLegalDocument.findMany(
            {
                where: { providerId },
            },
        );

        const verifiedDocumentCount = legalDocuments.filter(
            (d) => d.verificationStatus === "VERIFIED",
        ).length;

        return {
            provider: {
                id: provider.id,
                providerName: provider.providerName,
                logoUrl: provider.logoUrl ?? undefined,
                bannerUrl: provider.bannerUrl ?? undefined,
                description: provider.description ?? undefined,
                phone: provider.phone ?? undefined,
                email: provider.email ?? undefined,
                website: provider.website ?? undefined,
                address: provider.address ?? undefined,
                companyName: provider.companyName ?? undefined,
                taxCode: provider.taxCode ?? undefined,
                businessLicenseNumber:
                    provider.businessLicenseNumber ?? undefined,
                representativeName: provider.representativeName ?? undefined,
                representativePosition:
                    provider.representativePosition ?? undefined,
                businessType: provider.businessType,
                providerType: provider.providerType,
                status: provider.status,
                isEkycVerified: provider.identity.isEkycVerified,
                createdAt: provider.createdAt.toISOString(),
            },
            legalDocuments: legalDocuments.map((d) => ({
                id: d.id,
                documentType: d.documentType,
                documentName: d.documentName ?? undefined,
                documentNumber: d.documentNumber ?? undefined,
                issueDate: d.issueDate?.toISOString(),
                expiryDate: d.expiryDate?.toISOString(),
                verificationStatus: d.verificationStatus,
                note: d.note ?? undefined,
            })),
            verifiedDocumentCount,
        };
    }
}
