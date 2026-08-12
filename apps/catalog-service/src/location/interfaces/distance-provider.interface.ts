export interface DistanceProvider {
  getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number | null>;
}
