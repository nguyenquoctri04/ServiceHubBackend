import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentMethodDto {
  CASH    = 'CASH',
  VNPAY   = 'VNPAY',
  ZALOPAY = 'ZALOPAY',
}

export class PayInvoiceDto {
  @IsEnum(PaymentMethodDto)
  paymentMethod: PaymentMethodDto;

  @IsOptional()
  @IsString()
  note?: string;
}
