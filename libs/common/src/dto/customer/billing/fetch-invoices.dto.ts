import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CustomerInvoicesQueryDto {
    @IsOptional()
    @IsIn(["ALL", "UNPAID", "PAID", "OVERDUE"])
    status?: "ALL" | "UNPAID" | "PAID" | "OVERDUE";

    @IsOptional()
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim() : value,
    )
    @IsString()
    @MaxLength(100)
    search?: string;
}
