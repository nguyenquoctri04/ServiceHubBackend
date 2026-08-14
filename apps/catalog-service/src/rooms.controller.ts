import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { ProviderBillingPatterns } from '@app/common/constants/provider.billing.patterns';

@Controller()
export class RoomsController {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern({ cmd: ProviderBillingPatterns.CATALOG_ROOMS_BY_IDS })
  async getRoomsByIds(@Payload() roomIds: string[]) {
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        floor: {
          include: {
            block: {
              include: {
                property: true
              }
            }
          }
        }
      }
    });

    const roomsMap = {};
    for (const room of rooms) {
      roomsMap[room.id] = room;
    }
    return roomsMap;
  }
}
