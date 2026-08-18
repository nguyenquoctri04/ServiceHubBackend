import { IsLatitude, IsLongitude, IsOptional } from "class-validator";
import { Type } from "class-transformer";

// Tên field khớp đúng query param FE đang gửi: ?latitude=&longitude=
export class GetRelatedServicesDto {
    @IsOptional()
    @Type(() => Number)
    @IsLatitude()
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsLongitude()
    longitude?: number;
}