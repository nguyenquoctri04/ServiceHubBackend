import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EkycService } from './ekyc.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@Controller()
export class EkycController {
  constructor(private readonly ekycService: EkycService) {}

  @MessagePattern({ cmd: 'ekyc.submit' })
  async submitVerification(@Payload() dto: SubmitVerificationDto) {
    return await this.ekycService.submitVerification(dto);
  }
}
