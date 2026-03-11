import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LOADER_ID = 'safarlink-google-loader';
const GOOGLE_MAPS_LIBRARIES = ['places'];

export function useGoogleMapsLoader() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const missingApiKey = !apiKey || !String(apiKey).trim();

  const loader = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: missingApiKey ? '' : apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return {
    ...loader,
    missingApiKey,
  };
}
