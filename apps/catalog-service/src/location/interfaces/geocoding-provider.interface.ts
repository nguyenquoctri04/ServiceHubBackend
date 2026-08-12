export interface GeocodingProvider {
  geocode(address: string): Promise<{ lat: number; lng: number } | null>;
}
