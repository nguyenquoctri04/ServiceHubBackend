export interface ExcelRowDto {
  meterId: string;
  roomId?: string;
  contractId?: string;
  value?: number;
  imgUrl?: string;
}

export interface ServiceCreatedPayload {
  id: string;
  name: string;
  calculation_method: string;
  providerId: string;
}
