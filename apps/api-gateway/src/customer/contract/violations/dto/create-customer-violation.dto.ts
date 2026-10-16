import {
    ArrayMaxSize,
    IsArray,
    IsISO8601,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    MaxLength,
    MinLength,
} from "class-validator";

export class CreateCustomerViolationDto {
    @IsUUID()
    contractId: string;

    @IsUUID()
    serviceId: string;

    @IsUUID()
    violationRuleId: string;

    @IsString()
    @MinLength(1)
    @MaxLength(4000)
    description: string;

    @IsISO8601()
    occurredAt: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(5)
    @IsUrl({}, { each: true })
    evidenceUrls?: string[];
}
