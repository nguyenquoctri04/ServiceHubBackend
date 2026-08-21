import { Prisma } from "@prisma/client-contract";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceBookingCommand } from "@app/common/dto/customer/contract";
import { createHash, randomUUID } from "crypto";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";

@Injectable()
export class CustomerContractsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,

        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,

        @Inject("NOTIFICATION_SERVICE")
        private readonly notificationClient: ClientProxy,

        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async getPopularServices(servicePriceIds: string[], limit: number) {
        if (servicePriceIds.length === 0) {
            return [];
        }

        const contractServices = await this.prisma.contractService.findMany({
            where: {
                servicePriceId: {
                    in: servicePriceIds,
                },
                contract: {
                    status: {
                        in: ["ACTIVE", "EXPIRED"],
                    },
                },
            },
            select: {
                servicePriceId: true,
            },
        });

        const countMap = new Map<string, number>();

        for (const item of contractServices) {
            countMap.set(
                item.servicePriceId,
                (countMap.get(item.servicePriceId) ?? 0) + 1,
            );
        }

        return Array.from(countMap.entries())
            .map(([servicePriceId, count]) => ({
                servicePriceId,
                count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    async getMarketplaceRestrictions(params: {
        customerId: string;
        serviceIds: string[];
        providerIds: string[];
    }) {
        const { customerId, serviceIds, providerIds } = params;

        const now = new Date();

        const restrictions = await this.prisma.restriction.findMany({
            where: {
                customerId,
                isDeleted: false,
                startAt: {
                    lte: now,
                },
                OR: [
                    {
                        endAt: null,
                    },
                    {
                        endAt: {
                            gt: now,
                        },
                    },
                ],
                AND: [
                    {
                        OR: [
                            {
                                scopeType: "PLATFORM",
                            },
                            {
                                scopeType: "PROVIDER",
                                providerId: {
                                    in: providerIds,
                                },
                            },
                            {
                                scopeType: "SERVICE",
                                serviceId: {
                                    in: serviceIds,
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                scopeType: true,
                providerId: true,
                serviceId: true,
            },
        });

        const blockedProviderIds = new Set<string>();
        const blockedServiceIds = new Set<string>();

        let platformBlocked = false;

        for (const restriction of restrictions) {
            switch (restriction.scopeType) {
                case "PLATFORM":
                    platformBlocked = true;
                    break;

                case "PROVIDER":
                    if (restriction.providerId) {
                        blockedProviderIds.add(restriction.providerId);
                    }
                    break;

                case "SERVICE":
                    if (restriction.serviceId) {
                        blockedServiceIds.add(restriction.serviceId);
                    }
                    break;
            }
        }

        return {
            platformBlocked,
            blockedProviderIds: [...blockedProviderIds],
            blockedServiceIds: [...blockedServiceIds],
        };
    }

    /**
     * Dùng cho trang chi tiết 1 service — kiểm tra cả 2 khả năng:
     * bị cấm ở cấp provider (scopeType=PROVIDER) HOẶC cấp service này
     * (scopeType=SERVICE), chỉ cần 1 query.
     */
    async checkServiceAccess(
        serviceId: string,
        providerId: string,
        customerId?: string,
    ): Promise<{ blocked: boolean }> {
        if (!customerId) return { blocked: false };

        const now = new Date();

        const restriction = await this.prisma.restriction.findFirst({
            where: {
                customerId,
                isDeleted: false,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: {
                    OR: [
                        { scopeType: "PROVIDER", providerId },
                        { scopeType: "SERVICE", serviceId },
                    ],
                },
            },
            select: { id: true },
        });

        return { blocked: !!restriction };
    }

    /**
     * Provider có bị cấm với customer này không — dựa trên Restriction
     * đang còn hiệu lực (chưa xoá mềm, trong khoảng startAt..endAt).
     */
    async checkProviderAccess(
        providerId: string,
        customerId?: string,
    ): Promise<{ blocked: boolean }> {
        if (!customerId) return { blocked: false };

        const now = new Date();

        const restriction = await this.prisma.restriction.findFirst({
            where: {
                scopeType: "PROVIDER",
                providerId,
                customerId,
                isDeleted: false,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
            select: { id: true },
        });

        return { blocked: !!restriction };
    }

    /**
     * Gộp 2 việc trong 1 lần gọi:
     * - usageCounts: "lượt đăng ký thành công" để catalog-service tính
     *   dịch vụ nổi bật.
     * - blockedServiceIds: service nào trong danh sách đang bị cấm riêng
     *   với customer này (Restriction scopeType=SERVICE).
     */
    async getProviderServiceInsights(
        items: Array<{ serviceId: string; servicePriceIds: string[] }>,
        customerId?: string,
    ): Promise<{
        usageCounts: Array<{ serviceId: string; count: number }>;
        blockedServiceIds: string[];
    }> {
        const usageCounts = await Promise.all(
            items.map(async ({ serviceId, servicePriceIds }) => {
                if (servicePriceIds.length === 0) {
                    return { serviceId, count: 0 };
                }

                const count = await this.prisma.contractService.count({
                    where: {
                        servicePriceId: { in: servicePriceIds },
                        contract: {
                            status: { in: ["ACTIVE", "EXPIRED"] },
                            violationCases: {
                                none: {
                                    serviceId,
                                    actions: {
                                        some: {
                                            actionType: { not: "NO_ACTION" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                return { serviceId, count };
            }),
        );

        let blockedServiceIds: string[] = [];

        if (customerId && items.length > 0) {
            const now = new Date();

            const restrictions = await this.prisma.restriction.findMany({
                where: {
                    scopeType: "SERVICE",
                    serviceId: { in: items.map((i) => i.serviceId) },
                    customerId,
                    isDeleted: false,
                    startAt: { lte: now },
                    OR: [{ endAt: null }, { endAt: { gte: now } }],
                },
                select: { serviceId: true },
            });

            blockedServiceIds = restrictions
                .map((r) => r.serviceId)
                .filter((id): id is string => !!id);
        }

        return { usageCounts, blockedServiceIds };
    }

    async createServiceBooking(command: CreateServiceBookingCommand) {
        const {
            customerId,
            servicePriceId,
            quantity,
            requireSignature,
            providerId,
            fromEmail,
        } = command;

        if (quantity < 1) {
            throw new BadRequestException("Số lượng không hợp lệ");
        }

        console.log(servicePriceId);

        const priceInfo = await this.secureRpc.send(
            this.catalogClient,
            { cmd: CustomerPatterns.VALIDATE_SERVICE_PRICE },
            { servicePriceId },
        );

        if (!priceInfo) {
            throw new BadRequestException(
                "Dịch vụ không tồn tại hoặc đã ngừng hoạt động.",
            );
        }

        // providerId client gửi lên phải khớp providerId thật của service —
        // tránh trường hợp gửi sai/giả providerId trong command.
        if (priceInfo.providerId !== providerId) {
            throw new BadRequestException("Thông tin dịch vụ không hợp lệ.");
        }

        const activeProviders = await this.secureRpc.send(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
            { providerIds: [providerId] },
        );

        if (activeProviders.length === 0) {
            throw new BadRequestException("Nhà cung cấp đã ngừng hoạt động.");
        }

        const { blocked } = await this.checkServiceAccess(
            priceInfo.serviceId,
            providerId,
            customerId,
        );

        if (blocked) {
            throw new BadRequestException("Bạn không thể đặt dịch vụ này.");
        }

        const now = new Date();

        const contractNumber = `CTR-${Date.now()}-${randomUUID()
            .replace(/-/g, "")
            .slice(0, 8)
            .toUpperCase()}`;

        const result = await this.prisma.$transaction(async (tx) => {
            const contract = await tx.contract.create({
                data: {
                    providerId: providerId,
                    contractNumber: contractNumber,
                    customerId: customerId,
                    startDate: now,
                    status: "DRAFT",
                    requireSignature: requireSignature,
                    createdAt: now,
                    updatedAt: now,
                },
            });

            const contractService = await tx.contractService.create({
                data: {
                    contractId: contract.id,
                    servicePriceId: servicePriceId,
                    quantity: quantity,
                    createdAt: now,
                },
            });

            return {
                contract,
                contractService,
            };
        });

        const providerIdentityId = activeProviders[0].identityId;

        try {
            await this.secureRpc.send(
                this.notificationClient,
                { cmd: CustomerPatterns.NOTIFY_SERVICE_REGISTRATION },
                {
                    providerUserId: providerIdentityId,
                    providerId,
                    fromEmail: fromEmail ?? "Người dùng ẩn danh",
                    serviceName: priceInfo.serviceName,
                    contractNumber: result.contract.contractNumber,
                    requireSignature,
                    occurredAt: now.toISOString(),
                },
            );
        } catch (err) {
            console.error("Gửi thông báo cho provider thất bại:", err);
        }

        return true;
    }

    /**
     * Cấp hash của file hợp đồng cho signature-service ký — ĐỒNG THỜI xác
     * thực identityId đang yêu cầu ký có thực sự là 1 bên trong hợp đồng
     * đó không (customer hoặc chính provider). Không cho ký hộ.
     */
    async getContractFileHashForSigning(
        contractFileId: string,
        identityId: string,
    ) {
        const file = await this.prisma.contractFile.findUnique({
            where: { id: contractFileId },
            include: { contract: true },
        });

        if (!file) {
            throw new RpcException(
                new NotFoundException("Không tìm thấy file hợp đồng."),
            );
        }

        const { isCustomer, isProvider, providerIdentityId } =
            await this.resolveContractParties(file.contract, identityId);

        if (!isCustomer && !isProvider) {
            throw new RpcException(
                new ForbiddenException("Bạn không có quyền ký hợp đồng này."),
            );
        }

        if (!file.hashContract) {
            throw new RpcException(
                new BadRequestException(
                    "File hợp đồng chưa được tính hash, không thể ký.",
                ),
            );
        }

        const actualHash = await this.computeFileHash(file.pdfUrl);

        if (actualHash !== file.hashContract) {
            throw new RpcException(
                new BadRequestException(
                    "File hợp đồng đã bị thay đổi so với hash gốc, không thể ký.",
                ),
            );
        }

        return {
            hashContract: file.hashContract,
            contractId: file.contractId,
            providerId: file.contract.providerId,
            providerIdentityId,
            customerId: file.contract.customerId,
            isProviderSigning: isProvider,
        };
    }

    private async computeFileHash(pdfUrl: string): Promise<string> {
        const response = await fetch(pdfUrl);

        if (!response.ok) {
            throw new RpcException(
                new BadRequestException(
                    "Không thể tải file hợp đồng để xác minh hash.",
                ),
            );
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return createHash("sha256").update(buffer).digest("hex");
    }

    async getContractFileHashForVerify(contractFileId: string) {
        const contractFile = await this.prisma.contractFile.findUnique({
            where: {
                id: contractFileId,
            },
            include: {
                contract: true,
            },
        });

        if (!contractFile) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy file hợp đồng.",
            });
        }

        // Lấy PDF thật từ storage
        const response = await fetch(contractFile.pdfUrl);

        if (!response.ok) {
            throw new RpcException({
                statusCode: 500,
                message: "Không thể lấy file hợp đồng.",
            });
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Hash lại file PDF hiện tại
        const currentHash = createHash("sha256").update(buffer).digest("hex");

        return {
            contractFileId: contractFile.id,
            hashContract: currentHash,
            providerIdentityId: contractFile.contract.providerId,
            customerId: contractFile.contract.customerId,
        };
    }

    async getUsedServices(
        customerId: string,
        query: { status?: string; page: number; pageSize: number },
    ) {
        const where = this.buildUsedServicesWhere(customerId, query.status);
        const skip = (query.page - 1) * query.pageSize;

        const [total, contracts] = await this.prisma.$transaction([
            this.prisma.contract.count({ where }),
            this.prisma.contract.findMany({
                where,
                skip,
                take: query.pageSize,
                orderBy: { createdAt: "desc" },
                include: this.usedServiceInclude(),
            }),
        ]);

        return {
            data: await this.enrichContracts(contracts),
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
            },
        };
    }

    async getUsedServiceDetail(customerId: string, contractId: string) {
        const contract = await this.prisma.contract.findFirst({
            where: { id: contractId, customerId }, // bỏ status: { not: "CANCELLED" }
            include: this.usedServiceInclude(),
        });

        if (!contract) return null;

        const [item] = await this.enrichContracts([contract]);
        return item;
    }

    private buildUsedServicesWhere(
        customerId: string,
        status?: string,
    ): Prisma.ContractWhereInput {
        const base: Prisma.ContractWhereInput = { customerId };

        switch (status) {
            case "PENDING_PROVIDER_APPROVAL":
                return { ...base, status: "DRAFT" };
            case "PENDING_SIGNATURE":
                return { ...base, status: "PENDING_SIGNATURE" };
            case "ACTIVE":
                return { ...base, status: "ACTIVE" };
            case "EXPIRED":
                return {
                    ...base,
                    status: { in: ["EXPIRED", "TERMINATED", "CANCELLED"] },
                };
            default:
                return base;
        }
    }

    private usedServiceInclude() {
        return {
            services: { take: 1 },
            files: true,
            terms: { include: { term: true } },
            violationCases: {
                where: { status: "REPORTED" as const },
                orderBy: { createdAt: "desc" as const },
                take: 1,
                include: { violationRule: true, evidence: true },
            },
        };
    }

    private deriveStatus(contractStatus: string): string {
        switch (contractStatus) {
            case "DRAFT":
                return "PENDING_PROVIDER_APPROVAL";
            case "PENDING_SIGNATURE":
                return "PENDING_SIGNATURE";
            case "ACTIVE":
                return "ACTIVE";
            case "EXPIRED":
                return "EXPIRED";
            case "TERMINATED":
                return "EXPIRED";
            case "CANCELLED":
                return "EXPIRED";
            default:
                return "ACTIVE";
        }
    }

    /**
     * Gộp toàn bộ dữ liệu cross-service (catalog/identity/signature) cho
     * ĐÚNG trang kết quả đã lọc+phân trang xong — không enrich cho cả
     * tập chưa lọc.
     */
    private async enrichContracts(contracts: any[]) {
        if (contracts.length === 0) return [];

        const servicePriceIds = [
            ...new Set(
                contracts
                    .map((c) => c.services[0]?.servicePriceId)
                    .filter((x): x is string => !!x),
            ),
        ];
        const providerIds = [...new Set(contracts.map((c) => c.providerId))];
        const contractFileIds = contracts.flatMap((c) =>
            c.files.map((f: any) => f.id),
        );

        const [priceDetails, providers, signatures] = await Promise.all([
            servicePriceIds.length > 0
                ? this.secureRpc.send<any[]>(
                      this.catalogClient,
                      { cmd: CustomerPatterns.GET_SERVICE_PRICE_DETAILS },
                      { servicePriceIds },
                  )
                : Promise.resolve([]),
            providerIds.length > 0
                ? this.secureRpc.send<any[]>(
                      this.identityClient,
                      { cmd: CustomerPatterns.GET_PROVIDERS_FULL },
                      { providerIds },
                  )
                : Promise.resolve([]),
            contractFileIds.length > 0
                ? this.secureRpc.send<any[]>(
                      this.signatureClient,
                      {
                          cmd: CustomerPatterns.GET_SIGNATURES_BY_CONTRACT_FILE_IDS,
                      },
                      { contractFileIds },
                  )
                : Promise.resolve([]),
        ]);

        const priceMap = new Map(
            priceDetails.map((p) => [p.servicePriceId, p]),
        );
        const providerMap = new Map(providers.map((p) => [p.id, p]));

        const signaturesByFile = new Map<string, any[]>();
        for (const sig of signatures) {
            const list = signaturesByFile.get(sig.contractFileId) ?? [];
            list.push(sig);
            signaturesByFile.set(sig.contractFileId, list);
        }

        return contracts.map((contract) => {
            const contractService = contract.services[0] ?? null;
            const priceDetail = contractService
                ? priceMap.get(contractService.servicePriceId)
                : undefined;
            const provider = providerMap.get(contract.providerId);
            const file = contract.files[0] ?? null;
            const violation = contract.violationCases[0] ?? null;

            const status = this.deriveStatus(contract.status);

            return {
                id: contract.id,
                service: priceDetail?.service ?? null,
                provider: provider ?? null,
                price: priceDetail
                    ? {
                          id: priceDetail.servicePriceId,
                          price: priceDetail.price,
                          unit: priceDetail.unit,
                          effectiveFrom: priceDetail.effectiveFrom,
                          effectiveTo: priceDetail.effectiveTo,
                      }
                    : null,
                contract: {
                    id: contract.id,
                    contractNumber: contract.contractNumber,
                    providerId: contract.providerId,
                    roomId: contract.roomId,
                    customerId: contract.customerId,
                    startDate: contract.startDate.toISOString(),
                    endDate: contract.endDate?.toISOString() ?? null,
                    status: contract.status,
                    requireSignature: contract.requireSignature,
                    signedAt: contract.signedAt?.toISOString() ?? null,
                    createdAt: contract.createdAt.toISOString(),
                    updatedAt: contract.updatedAt.toISOString(),
                },
                contractService: contractService
                    ? {
                          id: contractService.id,
                          contractId: contractService.contractId,
                          servicePriceId: contractService.servicePriceId,
                          quantity: contractService.quantity
                              ? Number(contractService.quantity)
                              : null,
                          createdAt: contractService.createdAt.toISOString(),
                      }
                    : null,
                contractFile: file
                    ? {
                          id: file.id,
                          contractId: file.contractId,
                          pdfUrl: file.pdfUrl,
                          hashContract: file.hashContract,
                      }
                    : null,
                signatures: file
                    ? (signaturesByFile.get(file.id) ?? []).map((s) => ({
                          id: s.id,
                          contractFileId: s.contractFileId,
                          gnupgKeyId: s.gnupgKeyId,
                          signatureFile: s.signatureFile,
                          signatureHash: s.signatureHash,
                          signedAt: new Date(s.signedAt).toISOString(),
                          createdAt: new Date(s.createdAt).toISOString(),
                      }))
                    : [],
                terms: contract.terms.map((ct: any) => ({
                    id: ct.id,
                    contractId: ct.contractId,
                    termId: ct.termId,
                    createdAt: ct.createdAt.toISOString(),
                    term: {
                        id: ct.term.id,
                        content: ct.term.content,
                        status: ct.term.status,
                        createdAt: ct.term.createdAt.toISOString(),
                    },
                })),
                violation: violation
                    ? {
                          id: violation.id,
                          violationRuleId: violation.violationRuleId,
                          contractId: violation.contractId,
                          providerId: violation.providerId,
                          reportedBy: violation.reportedBy,
                          serviceId: violation.serviceId,
                          status: violation.status,
                          description: violation.description,
                          occurredAt: violation.occurredAt.toISOString(),
                          createdAt: violation.createdAt.toISOString(),
                          updatedAt: violation.updatedAt.toISOString(),
                          violationRule: {
                              id: violation.violationRule.id,
                              name: violation.violationRule.name,
                              description: violation.violationRule.description,
                              targetType: violation.violationRule.targetType,
                              isActive: violation.violationRule.isActive,
                              createdAt:
                                  violation.violationRule.createdAt.toISOString(),
                              updatedAt:
                                  violation.violationRule.updatedAt.toISOString(),
                          },
                          evidence: violation.evidence.map((e: any) => ({
                              id: e.id,
                              violationCaseId: e.violationCaseId,
                              fileUrl: e.fileUrl,
                          })),
                      }
                    : null,
                status,
            };
        });
    }

    private async resolveContractParties(
        contract: { customerId: string; providerId: string },
        identityId: string,
    ) {
        const isCustomer = contract.customerId === identityId;

        const providers = await this.secureRpc.send<
            Array<{ id: string; identityId: string }>
        >(
            this.identityClient,
            { cmd: CustomerPatterns.GET_PROVIDER_IN_POPULAR },
            { providerIds: [contract.providerId] },
        );

        const providerIdentityId = providers[0]?.identityId ?? null;
        const isProvider = providerIdentityId === identityId;

        return { isCustomer, isProvider, providerIdentityId };
    }

    /**
     * Xem hợp đồng — CHỈ customer hoặc provider của đúng hợp đồng đó, và
     * BẮT BUỘC file thật khớp hash đã lưu (tự tải lại PDF, tính lại
     * SHA-256, đối chiếu) — khác thì chặn hẳn, không trả pdfUrl.
     *
     * LƯU Ý: ContractFile hiện không có createdAt trong schema, nên nếu
     * 1 Contract có nhiều file (tái phát hành), việc lấy "file mới nhất"
     * qua take:1 không đảm bảo đúng thứ tự thời gian. Nếu thực tế 1
     * contract chỉ có đúng 1 file (như luồng ký hiện tại) thì không ảnh
     * hưởng; nếu có nhiều file, cần thêm createdAt vào ContractFile.
     */
    async getContractFileForViewing(contractId: string, identityId: string) {
        const contract = await this.prisma.contract.findUnique({
            where: { id: contractId },
            include: { files: { take: 1 } },
        });

        if (!contract) {
            throw new RpcException(
                new NotFoundException("Không tìm thấy hợp đồng."),
            );
        }

        const { isCustomer, isProvider } = await this.resolveContractParties(
            contract,
            identityId,
        );

        if (!isCustomer && !isProvider) {
            throw new RpcException(
                new ForbiddenException("Bạn không có quyền xem hợp đồng này."),
            );
        }

        const file = contract.files[0];

        if (!file) {
            throw new RpcException(
                new NotFoundException("Hợp đồng chưa có file."),
            );
        }

        if (!file.hashContract) {
            throw new RpcException(
                new BadRequestException(
                    "Hợp đồng chưa hoàn tất quy trình, chưa thể xác minh để xem.",
                ),
            );
        }

        const actualHash = await this.computeFileHash(file.pdfUrl);

        if (actualHash !== file.hashContract) {
            console.error("[SECURITY] Contract file integrity mismatch", {
                contractId,
                contractFileId: file.id,
            });

            throw new RpcException(
                new ConflictException(
                    "Hợp đồng đã bị thay đổi so với bản gốc, không thể hiển thị.",
                ),
            );
        }

        return {
            contractId: contract.id,
            contractFileId: file.id,
            pdfUrl: file.pdfUrl,
        };
    }

    async activateContractAfterCustomerSign(contractFileId: string) {
        const contractFile = await this.prisma.contractFile.findUnique({
            where: {
                id: contractFileId,
            },
            select: {
                id: true,
                contractId: true,
            },
        });

        if (!contractFile) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy file hợp đồng.",
            });
        }

        const contract = await this.prisma.contract.findUnique({
            where: {
                id: contractFile.contractId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!contract) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy hợp đồng.",
            });
        }

        // Đã ACTIVE thì không cần cập nhật lại
        if (contract.status === "ACTIVE") {
            return {
                contractId: contract.id,
                status: contract.status,
            };
        }

        const updatedContract = await this.prisma.contract.update({
            where: {
                id: contract.id,
            },
            data: {
                status: "ACTIVE",
            },
            select: {
                id: true,
                status: true,
            },
        });

        return {
            contractId: updatedContract.id,
            status: updatedContract.status,
        };
    }
}
