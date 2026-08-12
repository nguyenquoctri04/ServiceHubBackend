import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { DistanceMatrixProvider } from './providers/distance-matrix.provider';

@Module({
  providers: [LocationService, DistanceMatrixProvider],
  exports: [LocationService],
})
export class LocationModule {}
