import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotifyServiceRegistrationInput } from "@app/common/dto/customer/contract";

@Injectable()
export class CustomerNotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async notifyServiceRegistration(input: NotifyServiceRegistrationInput) {
        const title = "Đăng ký dịch vụ";

        const content = [
            `Khách hàng ${input.fromEmail} vừa đăng ký dịch vụ "${input.serviceName}".`,
            `Thời gian: ${input.occurredAt.toLocaleString("vi-VN")}.`,
            input.requireSignature
                ? "Đơn đăng ký này cần ký hợp đồng."
                : "Đơn đăng ký này không cần ký hợp đồng.",
            `Mã hợp đồng: ${input.contractNumber}.`,
        ].join(" ");

        return this.prisma.notification.create({
            data: {
                userId: input.providerUserId,
                providerId: input.providerId,
                title,
                content,
                channel: "IN_APP",
                status: "PENDING",
                sendAt: new Date(),
            },
        });
    }
}
