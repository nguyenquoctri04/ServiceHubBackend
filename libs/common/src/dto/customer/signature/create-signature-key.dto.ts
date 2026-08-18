import { IsOptional, IsString } from "class-validator";

export class CreateSignatureKeyDto {
    @IsString()
    passphrase: string;

    @IsOptional()
    @IsString()
    expiresIn?: string;
}

export class SignContractFileDto {
    @IsString()
    contractFileId: string;

    @IsString()
    passphrase: string;
}
