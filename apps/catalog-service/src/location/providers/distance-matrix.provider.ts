import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeocodingProvider } from '../interfaces/geocoding-provider.interface';
import { DistanceProvider } from '../interfaces/distance-provider.interface';

@Injectable()
export class DistanceMatrixProvider implements GeocodingProvider, DistanceProvider {
  private readonly logger = new Logger(DistanceMatrixProvider.name);
  private readonly geocodeApiKey: string;
  private readonly distanceApiKey: string;
  private readonly timeoutMs = 4000; // 4 seconds timeout for API calls

  constructor(private configService: ConfigService) {
    this.geocodeApiKey = this.configService.get<string>('GEOCODING_FAST_API_KEY') || '';
    this.distanceApiKey = this.configService.get<string>('DISTANCE_MATRIX_FAST_API_KEY') || '';
  }

  private extractCoordinates(data: unknown): { lat: number; lng: number } | null {
    if (!data || typeof data !== 'object') return null;
    const result = (data as { status?: unknown; results?: unknown }).results;
    if ((data as { status?: unknown }).status !== 'OK' || !Array.isArray(result) || result.length === 0) return null;

    const location = (result[0] as { geometry?: { location?: unknown } })?.geometry?.location;
    if (!location || typeof location !== 'object') return null;
    const { lat, lng } = location as { lat?: unknown; lng?: unknown };
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.geocodeApiKey) {
      this.logger.warn('GEOCODING_FAST_API_KEY is not configured');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const url = `https://api.distancematrix.ai/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.geocodeApiKey}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          this.logger.warn(`Geocoding API failed with status: ${response.status}`);
          return null;
        }

        const location = this.extractCoordinates(await response.json());
        if (!location) {
          this.logger.warn('Geocoding API returned an invalid location payload');
          return null;
        }
        return location;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.error(`Geocoding failed: ${error.message}`);
      return null; // Fail-open strategy
    }
  }

  async getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number | null> {
    if (!this.distanceApiKey) {
      this.logger.warn('DISTANCE_MATRIX_FAST_API_KEY is not configured');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const origins = `${origin.lat},${origin.lng}`;
      const destinations = `${destination.lat},${destination.lng}`;
      const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${this.distanceApiKey}`;
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(`Distance API failed with status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.status !== 'OK' || !data.rows || data.rows.length === 0) {
        this.logger.warn(`Distance API returned status: ${data.status}`);
        return null;
      }

      const element = data.rows[0].elements[0];
      if (element.status !== 'OK') {
        this.logger.warn(`Distance element status: ${element.status}`);
        return null;
      }

      // Distance in meters, convert to km
      const distanceMeters = element.distance.value;
      return distanceMeters / 1000;
    } catch (error) {
      this.logger.error(`Distance calculation failed: ${error.message}`);
      return null; // Fail-open strategy
    }
  }
}
