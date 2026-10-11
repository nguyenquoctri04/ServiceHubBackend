import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EkycService } from './ekyc.service';
import { ExtractOcrDto } from './dto/extract-ocr.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';

@Controller()
export class EkycController {
  constructor(private readonly ekycService: EkycService) {}

  @MessagePattern({ cmd: CustomerPatterns.EKYC_OCR })
  async extractOcr(@Payload() dto: ExtractOcrDto) {
    return await this.ekycService.extractOcr(dto);
  }

  @MessagePattern({ cmd: CustomerPatterns.EKYC_VERIFY_FACE })
  async verifyFace(@Payload() dto: VerifyFaceDto) {
    return await this.ekycService.verifyFace(dto);
  }
}
