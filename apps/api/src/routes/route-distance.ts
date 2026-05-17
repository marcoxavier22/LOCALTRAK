type DistancePoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  recordedAt: Date;
};

const EARTH_RADIUS_KM = 6371;
const MAX_ACCEPTED_ACCURACY_METERS = 100;

export function calculateRouteDistanceKm(points: DistancePoint[]) {
  const validPoints = points
    .filter((point) => point.accuracy == null || point.accuracy <= MAX_ACCEPTED_ACCURACY_METERS)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  let total = 0;

  for (let index = 1; index < validPoints.length; index += 1) {
    const previous = validPoints[index - 1];
    const current = validPoints[index];

    if (previous.latitude === current.latitude && previous.longitude === current.longitude) {
      continue;
    }

    total += haversineKm(previous.latitude, previous.longitude, current.latitude, current.longitude);
  }

  return Number(total.toFixed(3));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
