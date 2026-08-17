export class DistanceUtil {
  /**
   * Calculates the distance between two geographical points using the Haversine formula.
   * @param lat1 Latitude of the first point in decimal degrees
   * @param lon1 Longitude of the first point in decimal degrees
   * @param lat2 Latitude of the second point in decimal degrees
   * @param lon2 Longitude of the second point in decimal degrees
   * @returns Distance in kilometers
   */
  static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
