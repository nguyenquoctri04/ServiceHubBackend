import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DigitalSignature } from "@app/common/dto/customer/identity";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scrypt,
} from "node:crypto";

const execFileAsync = promisify(execFile);
const scryptAsync = promisify(scrypt);

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_LENGTH = 32;
const ENCRYPTION_SALT_LENGTH = 16;
const ENCRYPTION_IV_LENGTH = 12;
const ENCRYPTION_AUTH_TAG_LENGTH = 16;

@Injectable()
export class KeysService {
    private readonly gnupgHome =
        process.env.GNUPGHOME ?? "/var/lib/signature-service/gnupg";

    constructor(private readonly prisma: PrismaService) {}

    /**
     * =========================================================
     * GET DIGITAL SIGNATURE
     * =========================================================
     */
    async getDigitalSignatureInSetting(
        identityId: string,
    ): Promise<DigitalSignature> {
        const key = await this.prisma.gnupgKey.findFirst({
            where: {
                identityId,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                keyId: true,
                fingerprint: true,
                publicKey: true,
                algorithm: true,
                status: true,
                createdAt: true,
                expiresAt: true,
                id: true,
            },
        });

        if (!key) {
            return {
                status: "NOT_CREATED",
                usageCount: 0,
            };
        }

        const usageCount = await this.prisma.contractSignature.count({
            where: {
                gnupgKeyId: key.id,
            },
        });

        let status: "ACTIVE" | "REVOKED" | "EXPIRED";

        if (key.status === "REVOKED") {
            status = "REVOKED";
        } else if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
            status = "EXPIRED";
        } else {
            status = "ACTIVE";
        }

        return {
            status,
            keyId: key.keyId,
            fingerprint: key.fingerprint,
            publicKey: key.publicKey,
            algorithm: key.algorithm,
            createdAt: key.createdAt.toISOString(),
            expiresAt: key.expiresAt?.toISOString(),
            usageCount,
        };
    }

    /**
     * =========================================================
     * CREATE KEY
     *
     * Flow:
     *
     * 1. Validate passphrase
     * 2. Generate GPG key
     * 3. Export public key
     * 4. Export private key to memory
     * 5. Encrypt private key using passphrase
     * 6. Save encrypted private key to DB
     * 7. Delete secret key from GPG keyring
     *
     * Passphrase is NEVER stored.
     * =========================================================
     */
    async createKey(input: {
        identityId: string;
        name: string;
        email: string;
        passphrase: string;
        expiresIn?: string;
    }) {
        const { identityId, name, email, passphrase, expiresIn = "2y" } = input;

        /**
         * -----------------------------------------------------
         * 1. Validate input
         * -----------------------------------------------------
         */
        if (!identityId || !name || !email || !passphrase) {
            throw new RpcException({
                statusCode: 400,
                message: "Identity, tên, email và passphrase là bắt buộc",
            });
        }

        if (passphrase.length < 8) {
            throw new RpcException({
                statusCode: 400,
                message: "Passphrase phải có ít nhất 8 ký tự",
            });
        }

        /**
         * -----------------------------------------------------
         * 2. Prepare GPG home
         * -----------------------------------------------------
         */
        await mkdir(this.gnupgHome, {
            recursive: true,
            mode: 0o700,
        });

        let fingerprint: string | null = null;

        try {
            /**
             * -------------------------------------------------
             * 3. Generate GPG key
             * -------------------------------------------------
             */
            await this.generateGpgKey({
                name,
                email,
                passphrase,
                expiresIn,
            });

            /**
             * -------------------------------------------------
             * 4. Get fingerprint
             * -------------------------------------------------
             */
            const { stdout: fingerprintOutput } = await execFileAsync(
                "gpg",
                ["--batch", "--with-colons", "--list-keys", email],
                {
                    env: {
                        ...process.env,
                        GNUPGHOME: this.gnupgHome,
                    },
                },
            );

            fingerprint = this.extractFingerprint(fingerprintOutput);

            if (!fingerprint) {
                throw new Error("Không thể lấy fingerprint của chữ ký số");
            }

            /**
             * -------------------------------------------------
             * 5. Export public key
             * -------------------------------------------------
             */
            const publicKey = await this.exportPublicKey(fingerprint);

            /**
             * -------------------------------------------------
             * 6. Export private key
             *
             * PRIVATE KEY CHỈ TỒN TẠI TRONG MEMORY.
             * -------------------------------------------------
             */
            const privateKey = await this.exportPrivateKey(
                fingerprint,
                passphrase,
            );

            /**
             * -------------------------------------------------
             * 7. Encrypt private key
             *
             * passphrase
             *      ↓
             * scrypt
             *      ↓
             * AES-256-GCM
             * -------------------------------------------------
             */
            const encrypted = await this.encryptPrivateKey(
                privateKey,
                passphrase,
            );

            /**
             * -------------------------------------------------
             * 8. Save to DB
             * -------------------------------------------------
             */
            const key = await this.prisma.$transaction(async (tx) => {
                const existingKey = await tx.gnupgKey.findFirst({
                    where: {
                        identityId,
                        status: "ACTIVE",
                    },
                    select: {
                        id: true,
                    },
                });

                if (existingKey) {
                    throw new RpcException({
                        statusCode: 400,
                        message: "Tài khoản đã có chữ ký số",
                    });
                }

                return tx.gnupgKey.create({
                    data: {
                        identityId,

                        keyId: fingerprint!.slice(-16),

                        fingerprint: fingerprint!,

                        publicKey,

                        encryptedPrivateKey: encrypted.ciphertext,

                        encryptionSalt: encrypted.salt,

                        encryptionIv: encrypted.iv,

                        encryptionAuthTag: encrypted.authTag,

                        encryptionVersion: 1,

                        algorithm: "RSA-4096",

                        status: "ACTIVE",

                        expiresAt: this.calculateExpiresAt(expiresIn),
                    },
                });
            });

            /**
             * -------------------------------------------------
             * 9. Delete secret key from GPG keyring
             *
             * DB đã có encrypted private key.
             *
             * Server không cần giữ secret key trong keyring.
             * -------------------------------------------------
             */
            try {
                await this.deleteSecretKey(fingerprint);
            } catch (deleteError) {
                /**
                 * Đây là lỗi bảo mật nghiêm trọng:
                 *
                 * DB đã lưu encrypted private key nhưng
                 * GPG vẫn còn plaintext secret key.
                 *
                 * Cố gắng cleanup lại.
                 */
                console.error(
                    "[KeysService.createKey] Failed to delete secret key",
                    {
                        fingerprint,
                        error: deleteError,
                    },
                );

                throw new RpcException({
                    statusCode: 500,
                    message: "Không thể hoàn tất bảo mật private key",
                });
            }

            /**
             * -------------------------------------------------
             * 10. Clear references
             * -------------------------------------------------
             *
             * privateKey nằm trong scope function.
             *
             * Không trả privateKey ra client.
             * -------------------------------------------------
             */

            return {
                id: key.id,
                keyId: key.keyId,
                fingerprint: key.fingerprint,
                publicKey: key.publicKey,
                algorithm: key.algorithm,
                status: key.status,
                createdAt: key.createdAt,
                expiresAt: key.expiresAt,
            };
        } catch (error: unknown) {
            /**
             * -------------------------------------------------
             * 11. Rollback GPG
             * -------------------------------------------------
             */
            if (fingerprint) {
                await this.rollbackGpgKey(fingerprint);
            }

            if (error instanceof RpcException) {
                throw error;
            }

            console.error("[KeysService.createKey]", error);

            throw new RpcException({
                statusCode: 500,
                message: "Không thể tạo chữ ký số",
            });
        }
    }

    /**
     * =========================================================
     * GENERATE GPG KEY
     * =========================================================
     */
    private async generateGpgKey(input: {
        name: string;
        email: string;
        passphrase: string;
        expiresIn: string;
    }) {
        const { name, email, passphrase, expiresIn } = input;

        await execFileAsync(
            "gpg",
            [
                "--batch",
                "--pinentry-mode",
                "loopback",
                "--passphrase",
                passphrase,

                "--quick-generate-key",

                `${name} <${email}>`,

                "rsa4096",

                "sign",

                expiresIn,
            ],
            {
                env: {
                    ...process.env,
                    GNUPGHOME: this.gnupgHome,
                },
            },
        );
    }

    /**
     * =========================================================
     * EXPORT PUBLIC KEY
     * =========================================================
     */
    private async exportPublicKey(fingerprint: string): Promise<string> {
        const { stdout } = await execFileAsync(
            "gpg",
            ["--armor", "--export", fingerprint],
            {
                env: {
                    ...process.env,
                    GNUPGHOME: this.gnupgHome,
                },
            },
        );

        return stdout;
    }

    /**
     * =========================================================
     * EXPORT PRIVATE KEY
     *
     * Return directly as string.
     * No temporary file.
     * =========================================================
     */
    private async exportPrivateKey(
        fingerprint: string,
        passphrase: string,
    ): Promise<string> {
        const { stdout } = await execFileAsync(
            "gpg",
            [
                "--batch",
                "--yes",
                "--pinentry-mode",
                "loopback",
                "--passphrase",
                passphrase,

                "--armor",

                "--export-options",
                "backup",

                "--export-secret-keys",
                fingerprint,
            ],
            {
                env: {
                    ...process.env,
                    GNUPGHOME: this.gnupgHome,
                },
            },
        );

        return stdout;
    }

    /**
     * =========================================================
     * ENCRYPT PRIVATE KEY
     *
     * scrypt(passphrase)
     *        ↓
     * 256-bit key
     *        ↓
     * AES-256-GCM
     * =========================================================
     */
    private async encryptPrivateKey(privateKey: string, passphrase: string) {
        const salt = randomBytes(ENCRYPTION_SALT_LENGTH);

        const iv = randomBytes(ENCRYPTION_IV_LENGTH);

        const derivedKey = (await scryptAsync(
            passphrase,
            salt,
            ENCRYPTION_KEY_LENGTH,
        )) as Buffer;

        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);

        const encrypted = Buffer.concat([
            cipher.update(Buffer.from(privateKey, "utf8")),
            cipher.final(),
        ]);

        const authTag = cipher.getAuthTag();

        return {
            ciphertext: encrypted.toString("base64"),

            salt: salt.toString("base64"),

            iv: iv.toString("base64"),

            authTag: authTag.toString("base64"),
        };
    }

    /**
     * =========================================================
     * DECRYPT PRIVATE KEY
     *
     * Method này sẽ dùng khi SIGN.
     * =========================================================
     */
    private async decryptPrivateKey(
        encryptedPrivateKey: string,
        saltBase64: string,
        ivBase64: string,
        authTagBase64: string,
        passphrase: string,
    ): Promise<string> {
        try {
            const ciphertext = Buffer.from(encryptedPrivateKey, "base64");

            const salt = Buffer.from(saltBase64, "base64");

            const iv = Buffer.from(ivBase64, "base64");

            const authTag = Buffer.from(authTagBase64, "base64");

            const derivedKey = (await scryptAsync(
                passphrase,
                salt,
                ENCRYPTION_KEY_LENGTH,
            )) as Buffer;

            const decipher = createDecipheriv(
                ENCRYPTION_ALGORITHM,
                derivedKey,
                iv,
            );

            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);

            return decrypted.toString("utf8");
        } catch {
            /**
             * AES-GCM auth tag fail hoặc
             * passphrase sai đều đi vào đây.
             *
             * Không nói cho attacker biết
             * ciphertext có tồn tại hay passphrase sai
             * theo cách quá chi tiết.
             */
            throw new RpcException({
                statusCode: 400,
                message:
                    "Passphrase không chính xác hoặc private key không hợp lệ",
            });
        }
    }

    /**
     * =========================================================
     * DELETE SECRET KEY FROM GPG
     * =========================================================
     */
    private async deleteSecretKey(fingerprint: string): Promise<void> {
        await execFileAsync(
            "gpg",
            ["--batch", "--yes", "--delete-secret-key", fingerprint],
            {
                env: {
                    ...process.env,
                    GNUPGHOME: this.gnupgHome,
                },
            },
        );
    }

    /**
     * =========================================================
     * ROLLBACK GPG KEY
     * =========================================================
     */
    private async rollbackGpgKey(fingerprint: string) {
        try {
            /**
             * Delete secret key first.
             */
            try {
                await execFileAsync(
                    "gpg",
                    ["--batch", "--yes", "--delete-secret-key", fingerprint],
                    {
                        env: {
                            ...process.env,
                            GNUPGHOME: this.gnupgHome,
                        },
                    },
                );
            } catch {
                /**
                 * Secret key might already have
                 * been deleted.
                 */
            }

            /**
             * Delete public key.
             */
            try {
                await execFileAsync(
                    "gpg",
                    ["--batch", "--yes", "--delete-key", fingerprint],
                    {
                        env: {
                            ...process.env,
                            GNUPGHOME: this.gnupgHome,
                        },
                    },
                );
            } catch {
                /**
                 * Public key might already have
                 * been deleted.
                 */
            }
        } catch (rollbackError) {
            console.error("[KeysService] GPG rollback failed", {
                fingerprint,
                error: rollbackError,
            });
        }
    }

    /**
     * =========================================================
     * EXTRACT FINGERPRINT
     * =========================================================
     */
    private extractFingerprint(output: string): string | null {
        const line = output.split("\n").find((line) => line.startsWith("fpr:"));

        if (!line) {
            return null;
        }

        const parts = line.split(":");

        return parts[9] ?? null;
    }

    /**
     * =========================================================
     * CALCULATE EXPIRATION
     * =========================================================
     */
    private calculateExpiresAt(expiresIn: string): Date | null {
        const match = expiresIn.match(/^(\d+)([dmy])$/);

        if (!match) {
            return null;
        }

        const value = Number(match[1]);

        const unit = match[2];

        const date = new Date();

        if (unit === "d") {
            date.setDate(date.getDate() + value);
        }

        if (unit === "m") {
            date.setMonth(date.getMonth() + value);
        }

        if (unit === "y") {
            date.setFullYear(date.getFullYear() + value);
        }

        return date;
    }

    /**
     * =========================================================
     * DECRYPT PRIVATE KEY FOR SIGNING
     *
     * Dùng bởi SignaturesService khi ký hợp đồng. Không trả private
     * key ra ngoài signature-service (chỉ dùng nội bộ, ngay lập tức
     * import vào keyring tạm rồi xoá).
     * =========================================================
     */
    async getDecryptedPrivateKeyForSigning(
        identityId: string,
        passphrase: string,
    ): Promise<{
        gnupgKeyId: string;
        fingerprint: string;
        privateKey: string;
    }> {
        const key = await this.prisma.gnupgKey.findFirst({
            where: { identityId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });

        if (!key) {
            throw new RpcException({
                statusCode: 404,
                message: "Tài khoản chưa có chữ ký số.",
            });
        }

        if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
            throw new RpcException({
                statusCode: 400,
                message: "Chữ ký số đã hết hạn.",
            });
        }

        const privateKey = await this.decryptPrivateKey(
            key.encryptedPrivateKey,
            key.encryptionSalt,
            key.encryptionIv,
            key.encryptionAuthTag,
            passphrase,
        );

        return {
            gnupgKeyId: key.id,
            fingerprint: key.fingerprint,
            privateKey,
        };
    }
}
