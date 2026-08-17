import { IsString, IsUrl } from 'class-validator';

export class OcrMeterDto {
  @IsUrl()
  @IsString()
  imgUrl: string;
}
