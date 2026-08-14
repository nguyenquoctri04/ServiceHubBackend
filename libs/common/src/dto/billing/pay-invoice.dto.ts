import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
}

export class PayInvoiceDto {
  @IsEnum(PaymentMethodDto)
  paymentMethod: PaymentMethodDto;

  @IsOptional()
  @IsString()
  note?: string;
}
