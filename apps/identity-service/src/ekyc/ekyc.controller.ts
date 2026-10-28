import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EkycService } from './ekyc.service';
import { CustomerPatterns } from '@app/common/constants/customer.patterns';
import { SubmitEkycDto, OcrDto, VerifyFaceDto } from './dto/submit-ekyc.dto';

@Controller()
export class EkycController {
    constructor(private readonly ekycService: EkycService) {}

    @MessagePattern({ cmd: CustomerPatterns.SUBMIT_EKYC })
    async submitVerification(@Payload() dto: SubmitEkycDto) {
        // Buffer đi qua Redis bị serialize thành { type: 'Buffer', data: [...] }
        // Cần restore lại Buffer thực
        if (dto.frontImageBuffer && !(dto.frontImageBuffer instanceof Buffer)) {
            dto.frontImageBuffer = Buffer.from((dto.frontImageBuffer as any).data);
        }
        if (dto.selfieImageBuffer && !(dto.selfieImageBuffer instanceof Buffer)) {
            dto.selfieImageBuffer = Buffer.from((dto.selfieImageBuffer as any).data);
        }

        return this.ekycService.submitVerification(dto);
    }

    @MessagePattern({ cmd: CustomerPatterns.OCR })
    async ocrCccd(@Payload() dto: OcrDto) {
        if (dto.frontImageBuffer && !(dto.frontImageBuffer instanceof Buffer)) {
            dto.frontImageBuffer = Buffer.from((dto.frontImageBuffer as any).data);
        }

        return this.ekycService.ocrCccd(dto);
    }

    @MessagePattern({ cmd: CustomerPatterns.VERIFY_FACE })
    async verifyFace(@Payload() dto: VerifyFaceDto) {
        if (dto.frontImageBuffer && !(dto.frontImageBuffer instanceof Buffer)) {
            dto.frontImageBuffer = Buffer.from((dto.frontImageBuffer as any).data);
        }
        if (dto.selfieImageBuffer && !(dto.selfieImageBuffer instanceof Buffer)) {
            dto.selfieImageBuffer = Buffer.from((dto.selfieImageBuffer as any).data);
        }

        return this.ekycService.verifyFace(dto);
    }
}
