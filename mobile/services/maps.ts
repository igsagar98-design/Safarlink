/**
 * Google Maps Configuration
 * 
 * For Expo Go (development preview):
 *   → Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to safarlink-driver/.env
 *
 * For APK build (EAS / production):
 *   → Add GOOGLE_MAPS_API_KEY to eas.json env section (already wired)
 *   → Or set it as an EAS Secret: `eas secret:create --name GOOGLE_MAPS_API_KEY --value YOUR_KEY`
 *
 * How to get a key:
 *   https://console.cloud.google.com/apis/credentials
 *   Enable: Maps SDK for Android, Directions API, Places API
 */

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const isMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0
  && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
