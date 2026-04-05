import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const LOCATION_TRACKING_TASK = 'SAFARLINK_LOCATION_TRACKING';
const ACTIVE_TRIP_ID_KEY = 'ACTIVE_TRIP_ID';
const ACTIVE_DRIVER_ID_KEY = 'ACTIVE_DRIVER_ID';

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Location tracking task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const [location] = locations;

    if (location) {
      const { latitude, longitude, speed, heading } = location.coords;
      
      try {
        // Get active trip and driver ID from storage
        const tripId = await AsyncStorage.getItem(ACTIVE_TRIP_ID_KEY);
        const driverId = await AsyncStorage.getItem(ACTIVE_DRIVER_ID_KEY);

        if (!tripId || !driverId) return;

        // 1. Send location to the Edge Function (Updates Trip Metadata + Triggers ETA Prediction)
        const { error: funcError } = await supabase.functions.invoke('driver-location-update', {
          body: {
            tripId: tripId,
            currentLatitude: latitude,
            currentLongitude: longitude,
          },
        });

        if (funcError) {
          console.error('Edge Function update failed, falling back to DB insert:', funcError);
          // 2. Fallback: Direct DB insert (Ensures location history is preserved even if function fails)
          await supabase
            .from('trip_location_updates')
            .insert({
               trip_id: tripId,
               latitude,
               longitude,
               speed: speed || 0,
               heading: heading || 0,
               recorded_at: new Date(location.timestamp).toISOString(),
            });
        }
          
        console.log('Location synced to trip:', tripId, latitude, longitude, funcError ? '(DB Fallback)' : '(Edge Function)');
      } catch (err) {
        console.error('Failed to sync location:', err);
      }
    }
  }
});

export const startLocationTracking = async (tripId: string, userId: string) => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') return false;

  // Persist trip information for background task access
  await AsyncStorage.setItem(ACTIVE_TRIP_ID_KEY, tripId);
  await AsyncStorage.setItem(ACTIVE_DRIVER_ID_KEY, userId);

  await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000, // 15 seconds for more frequent updates
    distanceInterval: 20, // 20 meters
    foregroundService: {
      notificationTitle: "Safarlink Tracking Active",
      notificationBody: "Sharing live location for current trip",
      notificationColor: "#2563EB",
    },
    pausesUpdatesAutomatically: false,
  });

  return true;
};

export const stopLocationTracking = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    await AsyncStorage.removeItem(ACTIVE_TRIP_ID_KEY);
    await AsyncStorage.removeItem(ACTIVE_DRIVER_ID_KEY);
  }
};
