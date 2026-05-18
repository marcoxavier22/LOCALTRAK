const LEGACY_RENDER_API_URL = 'https://localtrak-api.onrender.com';
const CURRENT_RENDER_API_URL = 'https://localtrak.onrender.com';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

export const API_URL =
  configuredApiUrl === LEGACY_RENDER_API_URL ? CURRENT_RENDER_API_URL : configuredApiUrl;

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
