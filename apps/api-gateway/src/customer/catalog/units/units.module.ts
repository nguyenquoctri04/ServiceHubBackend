import { Module } from '@nestjs/common';
import { CustomerUnitsController } from './units.controller';
import { CustomerUnitsService } from './units.service';

@Module({
  controllers: [CustomerUnitsController],
  providers: [CustomerUnitsService],
  exports: [CustomerUnitsService],
})
export class UnitsModule {}