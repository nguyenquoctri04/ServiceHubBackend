import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { RpcException } from "@nestjs/microservices";
import { SecureRpcService } from "@app/common";
import { CustomerPatterns } from "@app/common/constants/customer.patterns";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import * as path from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { KeysService } from "../keys/keys.service";

const execFileAsync = promisify(execFile);

interface ContractFileForSigning {
    hashContract: string;
    contractId: string;
    providerId: string;
    providerIdentityId: string | null;
    customerId: string;
    isProviderSigning: boolean;
}

@Injectable()
export class SignaturesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly keysService: KeysService,

        @Inject("CONTRACT_SERVICE")
        private readonly contractClient: ClientProxy,

        private readonly secureRpc: SecureRpcService,
    ) {}

    async signContract(input: {
        identityId: string;
        contractFileId: string;
        passphrase: string;
    }) {
        const { identityId, contractFileId, passphrase } = input;

        // (1) Lấy hash (đã được contract-service tự verify khớp file thật)
        // + xác thực quyền ký.
        const fileInfo = await this.secureRpc.send<ContractFileForSigning>(
            this.contractClient,
            { cmd: CustomerPatterns.GET_CONTRACT_FILE_HASH_FOR_SIGNING },
            { contractFileId, identityId },
        );

        const { hashContract, providerIdentityId, isProviderSigning } =
            fileInfo;

        // (2) Customer chỉ được ký SAU khi provider đã ký, và chữ ký đó
        // phải verify lại bằng GPG là còn hợp lệ (không chỉ dựa vào việc
        // record tồn tại trong DB).
        if (!isProviderSigning) {
            await this.assertProviderSignatureValid(
                contractFileId,
                providerIdentityId,
            );
        }

        const { gnupgKeyId, fingerprint, privateKey } =
            await this.keysService.getDecryptedPrivateKeyForSigning(
                identityId,
                passphrase,
            );

        const existing = await this.prisma.contractSignature.findFirst({
            where: { contractFileId, gnupgKeyId },
            select: { id: true },
        });

        if (existing) {
            throw new RpcException({
                statusCode: 400,
                message: "Bạn đã ký file hợp đồng này rồi.",
            });
        }

        const tempHome = path.join("/tmp/signature-service/sign", randomUUID());

        try {
            await mkdir(tempHome, { recursive: true, mode: 0o700 });

            const keyFile = path.join(tempHome, "key.asc");
            await writeFile(keyFile, privateKey, "utf8");

            await execFileAsync(
                "gpg",
                [
                    "--batch",
                    "--yes",
                    "--pinentry-mode",
                    "loopback",
                    "--passphrase",
                    passphrase,
                    "--import",
                    keyFile,
                ],
                { env: { ...process.env, GNUPGHOME: tempHome } },
            );

            const dataFile = path.join(tempHome, "data.txt");
            const sigFile = path.join(tempHome, "signature.asc");

            await writeFile(dataFile, hashContract, "utf8");

            await execFileAsync(
                "gpg",
                [
                    "--batch",
                    "--yes",
                    "--pinentry-mode",
                    "loopback",
                    "--passphrase",
                    passphrase,
                    "--local-user",
                    fingerprint,
                    "--armor",
                    "--detach-sign",
                    "--output",
                    sigFile,
                    dataFile,
                ],
                { env: { ...process.env, GNUPGHOME: tempHome } },
            );

            const signatureFile = await readFile(sigFile, "utf8");

            const signature = await this.prisma.contractSignature.create({
                data: {
                    contractFileId,
                    gnupgKeyId,
                    signatureFile,
                    signatureHash: hashContract,
                    signedAt: new Date(),
                },
            });

            // Customer ký thành công -> activate contract
            if (!isProviderSigning) {
                await this.secureRpc.send(
                    this.contractClient,
                    {
                        cmd: CustomerPatterns.ACTIVATE_CONTRACT_AFTER_CUSTOMER_SIGN,
                    },
                    {
                        contractFileId,
                    },
                );
            }

            return {
                id: signature.id,
                contractFileId: signature.contractFileId,
                signedAt: signature.signedAt.toISOString(),
            };
        } catch (error: unknown) {
            if (error instanceof RpcException) throw error;

            console.error("[SignaturesService.signContract]", error);

            throw new RpcException({
                statusCode: 500,
                message: "Không thể ký file hợp đồng.",
            });
        } finally {
            await rm(tempHome, { recursive: true, force: true });
        }
    }

    /**
     * Provider phải đã ký, và chữ ký đó phải verify lại bằng GPG là còn
     * hợp lệ (key chưa bị revoke/hết hạn sau thời điểm ký, chữ ký chưa
     * bị hỏng) thì customer mới được ký tiếp.
     */
    private async assertProviderSignatureValid(
        contractFileId: string,
        providerIdentityId: string | null,
    ) {
        if (!providerIdentityId) {
            throw new RpcException({
                statusCode: 400,
                message: "Không xác định được nhà cung cấp của hợp đồng.",
            });
        }

        const providerKey = await this.prisma.gnupgKey.findFirst({
            where: { identityId: providerIdentityId },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });

        const providerSignature = providerKey
            ? await this.prisma.contractSignature.findFirst({
                  where: { contractFileId, gnupgKeyId: providerKey.id },
              })
            : null;

        if (!providerSignature) {
            throw new RpcException({
                statusCode: 400,
                message: "Nhà cung cấp chưa ký hợp đồng này.",
            });
        }

        const result = await this.verifySignatureRecord(providerSignature.id);

        if (!result.valid) {
            throw new RpcException({
                statusCode: 400,
                message:
                    "Chữ ký của nhà cung cấp không hợp lệ, không thể tiếp tục ký.",
            });
        }
    }

    async verifyContractSignature(signatureId: string) {
        return this.verifySignatureRecord(signatureId);
    }

    private async verifySignatureRecord(
        signatureId: string,
        currentContractHash?: string,
    ) {
        const signature = await this.prisma.contractSignature.findUnique({
            where: { id: signatureId },
            include: { gnupgKey: true },
        });

        if (!signature) {
            throw new RpcException({
                statusCode: 404,
                message: "Không tìm thấy chữ ký.",
            });
        }

        const hashValid = currentContractHash
            ? currentContractHash === signature.signatureHash
            : true;

        if (!hashValid) {
            return {
                valid: false,
                hashValid: false,
                signedAt: signature.signedAt.toISOString(),
                fingerprint: signature.gnupgKey.fingerprint,
            };
        }

        const tempHome = path.join(
            "/tmp/signature-service/verify",
            randomUUID(),
        );

        try {
            await mkdir(tempHome, {
                recursive: true,
                mode: 0o700,
            });

            const dataFile = path.join(tempHome, "data.txt");
            const sigFile = path.join(tempHome, "signature.asc");
            const pubKeyFile = path.join(tempHome, "public.asc");

            await writeFile(dataFile, signature.signatureHash, "utf8");

            await writeFile(sigFile, signature.signatureFile, "utf8");

            await writeFile(pubKeyFile, signature.gnupgKey.publicKey, "utf8");

            const env = {
                ...process.env,
                GNUPGHOME: tempHome,
            };

            await execFileAsync("gpg", ["--batch", "--import", pubKeyFile], {
                env,
            });

            const { stdout, stderr } = await execFileAsync(
                "gpg",
                ["--status-fd", "1", "--verify", sigFile, dataFile],
                { env },
            ).catch((err) => ({
                stdout: err.stdout ?? "",
                stderr: err.stderr ?? "",
            }));

            const output = `${stdout}\n${stderr}`;

            const valid =
                output.includes("[GNUPG:] GOODSIG") &&
                output.includes("[GNUPG:] VALIDSIG");

            return {
                valid: valid && hashValid,
                hashValid,
                signedAt: signature.signedAt.toISOString(),
                fingerprint: signature.gnupgKey.fingerprint,
            };
        } finally {
            await rm(tempHome, {
                recursive: true,
                force: true,
            });
        }
    }

    async verifyContractSignatures(contractFileId: string) {
        // 1. Lấy thông tin contract file hiện tại từ contract-service
        const fileInfo = await this.secureRpc.send<{
            contractFileId: string;
            hashContract: string;
            providerIdentityId: string | null;
            customerId: string;
        }>(
            this.contractClient,
            { cmd: CustomerPatterns.GET_CONTRACT_FILE_HASH_FOR_VERIFY },
            {
                contractFileId,
                identityId: undefined,
            },
        );

        const signatures = await this.prisma.contractSignature.findMany({
            where: {
                contractFileId,
            },
            include: {
                gnupgKey: true,
            },
            orderBy: {
                signedAt: "asc",
            },
        });

        if (signatures.length === 0) {
            return {
                contractFileId,
                valid: false,
                message: "Hợp đồng chưa có chữ ký.",
                signatures: [],
            };
        }

        const results = await Promise.all(
            signatures.map(async (signature) => {
                const verification = await this.verifySignatureRecord(
                    signature.id,
                    fileInfo.hashContract,
                );

                return {
                    signatureId: signature.id,
                    identityId: signature.gnupgKey.identityId,
                    fingerprint: signature.gnupgKey.fingerprint,
                    signedAt: signature.signedAt.toISOString(),
                    valid: verification.valid,
                    hashValid: verification.hashValid,
                };
            }),
        );

        const providerSignature = results.find(
            (signature) => signature.identityId === fileInfo.providerIdentityId,
        );

        const customerSignatures = results.filter(
            (signature) => signature.identityId !== fileInfo.providerIdentityId,
        );

        // Chỉ đánh giá "hợp lệ về mặt mật mã" cho những chữ ký ĐANG TỒN
        // TẠI — không coi "chưa ký" là "sai". Đây là 2 khái niệm khác nhau.
        const providerSignatureIntegrityOk =
            !providerSignature ||
            (providerSignature.valid && providerSignature.hashValid);

        const customerSignaturesIntegrityOk = customerSignatures.every(
            (signature) => signature.valid && signature.hashValid,
        );

        const providerSigned = !!providerSignature;
        const customerSigned = customerSignatures.length > 0;

        return {
            contractFileId,
            // Toàn vẹn mật mã: chữ ký nào có thì phải đúng, không quan
            // tâm đã đủ các bên ký hay chưa. False = có chữ ký bị hỏng/
            // giả mạo thật sự -> cảnh báo nghiêm trọng.
            integrityValid:
                providerSignatureIntegrityOk && customerSignaturesIntegrityOk,
            // Đã ký đủ cả 2 bên chưa — bình thường sẽ false cho tới khi
            // customer ký xong, không phải lỗi.
            fullySigned: providerSigned && customerSigned,
            providerSigned,
            customerSigned,
            provider: providerSignature
                ? {
                      signatureId: providerSignature.signatureId,
                      fingerprint: providerSignature.fingerprint,
                      signedAt: providerSignature.signedAt,
                      valid: providerSignature.valid,
                      hashValid: providerSignature.hashValid,
                  }
                : null,
            customer: customerSignatures.map((signature) => ({
                signatureId: signature.signatureId,
                fingerprint: signature.fingerprint,
                signedAt: signature.signedAt,
                valid: signature.valid,
                hashValid: signature.hashValid,
            })),
        };
    }

    async getSignaturesByContractFileIds(contractFileIds: string[]) {
        if (contractFileIds.length === 0) return [];

        return this.prisma.contractSignature.findMany({
            where: { contractFileId: { in: contractFileIds } },
            orderBy: { signedAt: "asc" },
        });
    }
}
