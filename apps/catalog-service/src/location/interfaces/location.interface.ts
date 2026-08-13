export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingProvider {
  geocode(address: string): Promise<Coordinates>;
}

export interface DistanceResult {
  distanceText: string;
  distanceValue: number; // in meters
  durationText: string;
  durationValue: number; // in seconds
}

export interface DistanceProvider {
  calculateDistance(origin: Coordinates, destination: Coordinates): Promise<DistanceResult>;
}
