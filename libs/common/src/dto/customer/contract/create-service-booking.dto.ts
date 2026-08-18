import { IsBoolean, IsInt, IsString, IsUUID, Min } from "class-validator";

export class CreateServiceBookingDto {
    @IsString()
    providerId: string;

    @IsString()
    servicePriceId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsBoolean()
    requireSignature: boolean;
}
