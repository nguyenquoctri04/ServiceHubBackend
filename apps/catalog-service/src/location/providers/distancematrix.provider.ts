import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeocodingProvider, DistanceProvider, Coordinates, DistanceResult } from '../interfaces/location.interface';

@Injectable()
export class DistanceMatrixProvider implements GeocodingProvider, DistanceProvider {
  private readonly logger = new Logger(DistanceMatrixProvider.name);
  private readonly geocodeApiKey: string;
  private readonly distanceApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.geocodeApiKey = this.configService.get<string>('GEOCODING_FAST_API_KEY');
    this.distanceApiKey = this.configService.get<string>('DISTANCE_MATRIX_FAST_API_KEY');
  }

  async geocode(address: string): Promise<Coordinates> {
    if (!this.geocodeApiKey) {
      this.logger.warn('GEOCODING_FAST_API_KEY is not set. Bypassing geocoding (returning dummy coordinates).');
      return { lat: 10.762622, lng: 106.660172 }; // Dummy center of HCMC
    }

    try {
      const url = `https://api.distancematrix.ai/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.geocodeApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result && data.result.length > 0) {
        const location = data.result[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      } else {
        this.logger.error(`Geocoding failed for address: ${address}, status: ${data.status}`);
        throw new HttpException('Failed to geocode address', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(`Geocoding request error: ${error.message}`);
      throw new HttpException('Geocoding service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async calculateDistance(origin: Coordinates, destination: Coordinates): Promise<DistanceResult> {
    if (!this.distanceApiKey) {
      this.logger.warn('DISTANCE_MATRIX_FAST_API_KEY is not set. Bypassing distance calculation (returning 0).');
      return { distanceText: '0 km', distanceValue: 0, durationText: '0 mins', durationValue: 0 };
    }

    try {
      const origins = `${origin.lat},${origin.lng}`;
      const destinations = `${destination.lat},${destination.lng}`;
      const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${this.distanceApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows && data.rows.length > 0 && data.rows[0].elements.length > 0) {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          return {
            distanceText: element.distance.text,
            distanceValue: element.distance.value,
            durationText: element.duration.text,
            durationValue: element.duration.value,
          };
        }
      }
      
      this.logger.error(`Distance calculation failed, element status: ${data?.rows?.[0]?.elements?.[0]?.status}`);
      throw new HttpException('Failed to calculate distance', HttpStatus.BAD_REQUEST);
    } catch (error) {
      this.logger.error(`Distance request error: ${error.message}`);
      throw new HttpException('Distance service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
