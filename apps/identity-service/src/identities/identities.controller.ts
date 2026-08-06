import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IdentitiesService } from './identities.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @MessagePattern({ cmd: 'identities.getProfile' })
  async getProfile(@Payload('id') id: string) {
    return await this.identitiesService.getProfile(id);
  }

  @MessagePattern({ cmd: 'identities.updateProfile' })
  async updateProfile(@Payload() payload: { id: string, dto: UpdateProfileDto }) {
    return await this.identitiesService.updateProfile(payload.id, payload.dto);
  }
}
