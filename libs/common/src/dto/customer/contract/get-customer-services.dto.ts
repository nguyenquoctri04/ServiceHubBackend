import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

const STATUSES = [
    "ALL",
    "PENDING_PROVIDER_APPROVAL",
    "PENDING_SIGNATURE",
    "PENDING_PAYMENT",
    "ACTIVE",
    "EXPIRED",
    "CANCELLED",
    "TERMINATED",
] as const;

export class GetCustomerServicesDto {
    @IsOptional()
    @IsIn(STATUSES)
    status?: (typeof STATUSES)[number];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    pageSize?: number = 10;
}
