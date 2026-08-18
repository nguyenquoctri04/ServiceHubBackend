import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServiceDetailProvider } from "@app/common/dto/customer/catalog";
import { RpcException } from "@nestjs/microservices";
import { CustomerInformation } from "@app/common/dto/customer/identity";

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
                identityId: true,
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

    async getCustomerInformation(
        customerId: string,
    ): Promise<CustomerInformation> {
        const identity = await this.prisma.identity.findUnique({
            where: {
                id: customerId,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                status: true,
                isEkycVerified: true,
                createdAt: true,

                verifications: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    select: {
                        provider: true,
                        verificationLevel: true,
                        faceSimilarity: true,
                        livenessScore: true,
                        failureReason: true,
                        verifiedAt: true,
                        expiredAt: true,

                        documents: {
                            orderBy: {
                                createdAt: "desc",
                            },
                            take: 1,
                            select: {
                                documentType: true,
                                documentNumber: true,
                                fullName: true,
                                dateOfBirth: true,
                                gender: true,
                                nationality: true,
                                frontImageUrl: true,
                                backImageUrl: true,
                            },
                        },
                    },
                },
            },
        });

        if (!identity) {
            throw new Error("Tài khoản không tồn tại");
        }

        const verification = identity.verifications[0];
        const document = verification?.documents[0];

        return {
            identity: {
                id: identity.id,
                status: identity.status,
                isEkycVerified: identity.isEkycVerified,
                createdAt: identity.createdAt.toISOString(),
            },

            personalInfo: {
                fullName: document?.fullName ?? "",
                dateOfBirth: document?.dateOfBirth?.toISOString(),
                gender: document?.gender ?? undefined,
                nationality: document?.nationality ?? undefined,

                // Chưa có trong database hiện tại
                placeOfBirth: undefined,
                permanentAddress: undefined,
                avatarUrl: undefined,
            },

            contactInfo: {
                email: identity.email,
                phone: identity.phone,
            },

            identityVerification: this.buildVerificationResponse(
                identity.isEkycVerified,
                verification,
                document,
            ),
        };
    }

    private buildVerificationResponse(
        isEkycVerified: boolean,
        verification: any,
        document: any,
    ): CustomerInformation["identityVerification"] {
        if (!verification) {
            return {
                status: "NOT_VERIFIED",
            };
        }

        if (verification.expiredAt) {
            const expiredAt = new Date(verification.expiredAt);

            if (expiredAt.getTime() < Date.now()) {
                return {
                    status: "EXPIRED",
                    documentType: document?.documentType ?? undefined,
                    documentNumber: document?.documentNumber ?? undefined,
                    frontImageUrl: document?.frontImageUrl ?? undefined,
                    backImageUrl: document?.backImageUrl ?? undefined,
                    verifiedAt: verification.verifiedAt?.toISOString(),
                    expiredAt: expiredAt.toISOString(),
                    failureReason: verification.failureReason ?? undefined,
                };
            }
        }

        if (isEkycVerified && verification.verifiedAt) {
            return {
                status: "VERIFIED",
                documentType: document?.documentType ?? undefined,
                documentNumber: document?.documentNumber ?? undefined,
                frontImageUrl: document?.frontImageUrl ?? undefined,
                backImageUrl: document?.backImageUrl ?? undefined,
                verifiedAt: verification.verifiedAt.toISOString(),
                expiredAt: verification.expiredAt?.toISOString(),
                failureReason: verification.failureReason ?? undefined,
            };
        }

        if (verification.failureReason) {
            return {
                status: "REJECTED",
                documentType: document?.documentType ?? undefined,
                documentNumber: document?.documentNumber ?? undefined,
                frontImageUrl: document?.frontImageUrl ?? undefined,
                backImageUrl: document?.backImageUrl ?? undefined,
                failureReason: verification.failureReason,
            };
        }

        return {
            status: "PENDING",
            documentType: document?.documentType ?? undefined,
            documentNumber: document?.documentNumber ?? undefined,
            frontImageUrl: document?.frontImageUrl ?? undefined,
            backImageUrl: document?.backImageUrl ?? undefined,
        };
    }

    async getSignatureInfo(identityId: string) {
        const now = new Date();

        const identity = await this.prisma.identity.findUnique({
            where: {
                id: identityId,
            },
            select: {
                id: true,
                email: true,
                isEkycVerified: true,

                verifications: {
                    where: {
                        verifiedAt: {
                            not: null,
                        },
                        OR: [
                            {
                                expiredAt: null,
                            },
                            {
                                expiredAt: {
                                    gt: now,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        verifiedAt: "desc",
                    },
                    select: {
                        verifiedAt: true,
                        expiredAt: true,

                        documents: {
                            where: {
                                fullName: {
                                    not: null,
                                },
                                OR: [
                                    {
                                        expiryDate: null,
                                    },
                                    {
                                        expiryDate: {
                                            gt: now,
                                        },
                                    },
                                ],
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                            select: {
                                fullName: true,
                                documentType: true,
                                expiryDate: true,
                            },
                        },
                    },
                },
            },
        });

        if (!identity) {
            throw new NotFoundException("Tài khoản không tồn tại");
        }

        if (!identity.isEkycVerified) {
            throw new BadRequestException("Tài khoản chưa được xác thực");
        }

        const document = identity.verifications
            .flatMap((verification) => verification.documents)
            .find((document) => document.fullName);

        if (!document?.fullName) {
            throw new BadRequestException("Không có giấy tờ hợp lệ");
        }

        return {
            id: identity.id,
            email: identity.email,
            name: document.fullName,
        };
    }
}
