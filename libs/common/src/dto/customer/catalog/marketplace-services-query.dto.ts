import { Type } from "class-transformer";
import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

export enum MarketplaceSortBy {
    NEWEST = "newest",
    NEAREST = "nearest",
}

export class MarketplaceServicesQueryDto {
    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    pageSize: number = 5;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    longitude?: number;

    @IsOptional()
    sortBy?: MarketplaceSortBy = MarketplaceSortBy.NEAREST;
}
