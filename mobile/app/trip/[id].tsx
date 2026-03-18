import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator,
  Dimensions, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../../constants/Colors';
import { useTrips, TripStatus, Trip } from '../../hooks/useTrips';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  ArrowLeft, MapPin, Clock, Truck, 
  ChevronRight, AlertTriangle, CheckCircle2,
  Navigation, XCircle, Play, Square, LocateFixed
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { startLocationTracking, stopLocationTracking, LOCATION_TRACKING_TASK } from '../../services/tracking';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { trips, loading, refresh, updateTripStatus, updateProgress } = useTrips();
  
  const trip = trips.find(t => t.id.toLowerCase() === (id as string).toLowerCase());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentDelay, setCurrentDelay] = useState<'none' | 'minor' | 'major'>('none');
  const [isSharing, setIsSharing] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(
    trip?.last_latitude && trip?.last_longitude 
      ? { lat: Number(trip.last_latitude), lng: Number(trip.last_longitude) } 
      : null
  );
  const mapRef = useRef<MapView>(null);

  // Check if we are showing placeholder data
  const isPlaceholder = trip?.origin === 'Main St Depot, Bangalore' && trip?.source_type === 'transporter_link';

  // LOGGING ACTUAL TRIP OBJECT FOR VERIFICATION (Rule 3)
  useEffect(() => {
    if (trip) {
      console.log('--- DEBUG: TRIP DATA VERIFICATION ---');
      console.log('1. RAW ROW FROM SUPABASE:', JSON.stringify(trip, null, 2));
      
      const mappedObject = {
        id: trip.id,
        pickup: trip.origin,
        drop: trip.destination,
        pickup_coords: { lat: trip.pickup_latitude, lng: trip.pickup_longitude },
        drop_coords: { lat: trip.drop_latitude, lng: trip.drop_longitude },
        current_coords: { lat: trip.last_latitude, lng: trip.last_longitude },
        status: trip.status,
        progress: trip.progress
      };
      console.log('2. MAPPED TRIP OBJECT:', JSON.stringify(mappedObject, null, 2));
      
      const nullFields = Object.entries(mappedObject)
        .filter(([_, v]) => v === null || (typeof v === 'object' && v !== null && Object.values(v).includes(null)))
        .map(([k]) => k);
      
      if (nullFields.length > 0) {
        console.warn('3. REQUIRED FIELDS THAT ARE NULL:', nullFields.join(', '));
      } else {
        console.log('3. ALL KEY FIELDS HAVE VALUES');
      }
      console.log('------------------------------------');
    }
  }, [trip]);

  // Robust coordinate resolution (Rule 2 & 5)
  const getCoords = (lat: any, lng: any) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0) {
      return { latitude: nLat, longitude: nLng };
    }
    return null;
  };

  const pickupCoords = getCoords(trip?.pickup_latitude, trip?.pickup_longitude);
  const destinationCoords = getCoords(trip?.drop_latitude, trip?.drop_longitude);
  const lastKnownDriverCoords = getCoords(trip?.last_latitude, trip?.last_longitude);

  // Initial region logic (Rule 5)
  // Default to Bangalore (12.9716, 77.5946) if no coordinates available
  const initialRegion = {
    latitude: lastKnownDriverCoords?.latitude || pickupCoords?.latitude || 12.9716,
    longitude: lastKnownDriverCoords?.longitude || pickupCoords?.longitude || 77.5946,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Check if sharing is already active
  useEffect(() => {
    const checkSharing = async () => {
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      setIsSharing(started);
    };
    checkSharing();
  }, []);

  // Subscribe to live location updates for this trip
  useEffect(() => {
    if (!id) return;

    const fetchLatestLoc = async () => {
      const { data } = await supabase
        .from('trip_location_updates')
        .select('latitude, longitude')
        .eq('trip_id', trip?.id || id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    };
    fetchLatestLoc();

    const channel = supabase
      .channel(`trip-loc-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_location_updates',
        filter: `trip_id=eq.${trip?.id || id}`
      }, (payload) => {
        const newLoc = { lat: payload.new.latitude, lng: payload.new.longitude };
        setDriverLocation(newLoc);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, trip?.id]);

  // Center map when driver location changes significantly
  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [driverLocation]);

  if (loading && !trip) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: 'DMSans_500Medium' }}>Trip not found ({id}).</Text>
        <Button title="Refresh" onPress={() => refresh()} style={{ marginTop: 20 }} />
        <Button title="Go Back" onPress={() => router.back()} variant="ghost" style={{ marginTop: 10 }} />
      </View>
    );
  }

  const handleSharingToggle = async () => {
    if (isSharing) {
      await stopLocationTracking();
      setIsSharing(false);
      Alert.alert('Stopped', 'Location sharing has been paused.');
    } else {
      if (!user) return;
      const success = await startLocationTracking(trip.id, user.id);
      if (success) {
        setIsSharing(true);
        Alert.alert('Live', 'Location sharing is now active for this trip.');
      } else {
        Alert.alert('Error', 'Failed to start location sharing. Please check permissions.');
      }
    }
  };

  const handleStatusUpdate = async (newStatus: TripStatus) => {
    if (newStatus === 'delivered' && trip.progress < 95) {
      Alert.alert(
        'Delivery Gate',
        `You can only mark as Delivered when you have reached at least 95% of the route. Current progress: ${trip.progress}%`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Update Status',
      `Are you sure you want to mark this trip as ${newStatus.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setIsUpdating(true);
            try {
              await updateTripStatus(trip.id, newStatus);
              if (newStatus === 'delivered' || newStatus === 'cancelled') {
                router.back();
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to update status: ' + err.message);
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    switch (trip.status) {
      case 'on_route': return colors.primary;
      case 'reached_pickup': return colors.success;
      case 'arrived_destination': return colors.warning;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const isDelivered = trip.status === 'delivered';
  const isCancelled = trip.status === 'cancelled';
  const isActive = !isDelivered && !isCancelled;

  // Map coordinates binding - Uses robustly resolved coordinates
  const polylineCoords = [pickupCoords, destinationCoords].filter(c => c !== null) as {latitude: number, longitude: number}[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header - Web Aligned Typography */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trip Details</Text>
          <View style={styles.headerSub}>
            <Text style={[styles.headerId, { color: colors.mutedForeground }]}>ID: {trip.id.slice(0, 8).toUpperCase()}</Text>
            {isPlaceholder && (
              <View style={[styles.liveIndicator, { backgroundColor: colors.warning + '15' }]}>
                <Text style={[styles.liveText, { color: colors.warning }]}>PLACEHOLDER DATA</Text>
              </View>
            )}
            {isSharing && !isPlaceholder && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => refresh()} style={[styles.backBtn, { marginLeft: 0 }]}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <LocateFixed size={18} color={colors.primary} />}
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '10', borderColor: getStatusColor() + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{trip.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Progress Card - Cleaner Spacing */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Route Progress</Text>
            <Text style={[styles.progressVal, { color: colors.primary }]}>{trip.progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted + '40' }]}>
            <View style={[styles.progressBar, { width: `${trip.progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressInfo}>
            <View style={styles.infoItem}>
              <Clock size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                ETA: {trip.current_eta 
                  ? new Date(trip.current_eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : trip.planned_arrival 
                    ? new Date(trip.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'CALC...'}
              </Text>
            </View>
            <View style={styles.infoItem}>
               <Truck size={14} color={colors.mutedForeground} />
               <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{trip.source_type?.replace('_', ' ').toUpperCase() || 'EXTERNAL'}</Text>
            </View>
          </View>
        </Card>

        {/* Map Section - Fixed Coordinates Binding (Rule 5) */}
        {!pickupCoords && !destinationCoords && !lastKnownDriverCoords && (
          <View style={[styles.noMapPlaceholder, { backgroundColor: colors.muted + '10', borderColor: colors.border }]}>
            <AlertTriangle size={24} color={colors.mutedForeground} />
            <Text style={[styles.noMapText, { color: colors.mutedForeground }]}>Map Unavailable: Missing Trip Coordinates</Text>
          </View>
        )}
        
        {(pickupCoords || destinationCoords || lastKnownDriverCoords) && (
          <View style={[styles.mapContainer, { borderColor: colors.border }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={initialRegion}
            >
              {pickupCoords && (
                <Marker coordinate={pickupCoords} title="Pickup">
                  <View style={[styles.markerIcon, { backgroundColor: colors.primary }]}>
                    <MapPin size={12} color="white" />
                  </View>
                </Marker>
              )}

              {destinationCoords && (
                <Marker coordinate={destinationCoords} title="Destination">
                  <View style={[styles.markerIcon, { backgroundColor: colors.success }]}>
                    <MapPin size={12} color="white" />
                  </View>
                </Marker>
              )}

              {driverLocation && (
                <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="You">
                  <View style={styles.driverMarker}>
                    <View style={styles.driverDot} />
                    <View style={styles.driverPulse} />
                  </View>
                </Marker>
              )}

              {polylineCoords.length > 1 && (
                <Polyline
                  coordinates={polylineCoords}
                  strokeColor={colors.primary}
                  strokeWidth={2}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
            <View style={styles.mapOverlays}>
              <TouchableOpacity 
                style={[styles.mapActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (driverLocation && mapRef.current) {
                    mapRef.current.animateToRegion({
                      latitude: driverLocation.lat,
                      longitude: driverLocation.lng,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    });
                  }
                }}
              >
                  <LocateFixed size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sharing Row - Matching Web Card feel */}
        {isActive && (
          <TouchableOpacity 
            style={[styles.sharingRow, { backgroundColor: isSharing ? colors.success + '10' : colors.primary + '05', borderColor: isSharing ? colors.success + '20' : colors.border }]}
            onPress={handleSharingToggle}
          >
             <View style={[styles.sharingIcon, { backgroundColor: isSharing ? colors.success : colors.primary }]}>
                {isSharing ? <Square size={16} color="white" fill="white" /> : <Play size={16} color="white" fill="white" />}
             </View>
             <View style={{ flex: 1 }}>
                <Text style={[styles.sharingTitle, { color: colors.foreground }]}>{isSharing ? 'Sharing is Active' : 'Share My Location'}</Text>
                <Text style={[styles.sharingSub, { color: colors.mutedForeground }]}>
                  {isSharing ? 'Live GPS sync is running' : 'Start background tracking'}
                </Text>
             </View>
             <ChevronRight size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Route Info - Verified Field Mapping (Rule 2 & 6) */}
        <Card style={styles.locationCard}>
          <View style={styles.routeItem}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '10' }]}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>PICKUP LOCATION</Text>
              <Text style={[styles.locationValue, { color: colors.foreground }]} numberOfLines={2}>{trip.origin || 'Not Available'}</Text>
            </View>
          </View>
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={styles.routeItem}>
            <View style={[styles.iconBox, { backgroundColor: colors.success + '10' }]}>
              <MapPin size={16} color={colors.success} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>DROP LOCATION</Text>
              <Text style={[styles.locationValue, { color: colors.foreground }]} numberOfLines={2}>{trip.destination || 'Not Available'}</Text>
            </View>
          </View>
        </Card>

        {isActive && (
          <>
            {/* Status Controls - Compact Typography */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>LIVE STATUS</Text>
            <View style={styles.statusControls}>
              {(['none', 'minor', 'major'] as const).map((delay) => (
                <TouchableOpacity 
                  key={delay}
                  style={[
                    styles.statusBtn, 
                    currentDelay === delay && { 
                      backgroundColor: delay === 'none' ? colors.primary : delay === 'minor' ? colors.warning : colors.destructive,
                      borderColor: 'transparent'
                    }
                  ]}
                  onPress={() => setCurrentDelay(delay)}
                >
                  <Text style={[styles.statusBtnText, { color: currentDelay === delay ? 'white' : colors.mutedForeground }]}>
                    {delay === 'none' ? 'On Route' : delay === 'minor' ? 'Delay Risk' : 'Major Delay'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions - Clean Spacing & Web Feel */}
            <View style={styles.actions}>
              {trip.status === 'validated' && (
                <Button 
                  title="Reached Pickup" 
                  onPress={() => handleStatusUpdate('reached_pickup')}
                  style={styles.actionBtn}
                  textStyle={styles.actionBtnText}
                />
              )}
              {['reached_pickup', 'validated'].includes(trip.status) && (
                <Button 
                  title="Start Transit" 
                  onPress={() => handleStatusUpdate('on_route')}
                  style={styles.actionBtn}
                  textStyle={styles.actionBtnText}
                />
              )}
              {trip.status === 'on_route' && (
                <Button 
                  title="Reached Destination" 
                  onPress={() => handleStatusUpdate('arrived_destination')}
                  style={styles.actionBtn}
                  textStyle={styles.actionBtnText}
                />
              )}
              
              <View style={{ marginTop: 8 }}>
                <Button 
                  title="Mark as Delivered" 
                  variant={trip.progress >= 95 ? "primary" : "secondary"}
                  onPress={() => handleStatusUpdate('delivered')}
                  style={StyleSheet.flatten([styles.deliveryBtn, { backgroundColor: trip.progress >= 95 ? colors.success : colors.muted }])}
                  disabled={trip.progress < 95 || isUpdating}
                >
                  <CheckCircle2 size={18} color={trip.progress >= 95 ? "white" : colors.mutedForeground} style={{ marginRight: 8 }} />
                </Button>
                {trip.progress < 95 && (
                  <Text style={styles.helperText}>
                    <AlertTriangle size={10} color={colors.mutedForeground} /> Only available at 95%+ progress
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleStatusUpdate('cancelled')}>
                <XCircle size={14} color={colors.mutedForeground} />
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel Session</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!isActive && (
          <View style={styles.completedInfo}>
             <CheckCircle2 size={40} color={isDelivered ? colors.success : colors.mutedForeground} />
             <Text style={[styles.completedTitle, { color: colors.foreground }]}>
               {isDelivered ? 'Trip Delivered' : 'Trip Cancelled'}
             </Text>
             <Text style={[styles.completedSubtitle, { color: colors.mutedForeground }]}>
               {isDelivered 
                 ? "Successfully completed trip." 
                 : "This session has ended."}
             </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  headerSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerId: { fontSize: 10, fontWeight: '700', fontFamily: 'DMSans_700Bold' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontSize: 8, fontFamily: 'DMSans_700Bold' },
  content: { padding: 16, paddingBottom: 60 },
  progressCard: { padding: 14, borderRadius: 16, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  progressVal: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', borderRadius: 3 },
  progressInfo: { flexDirection: 'row', gap: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 10, fontWeight: '600' },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
  },
  noMapPlaceholder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noMapText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlays: { position: 'absolute', bottom: 10, right: 10 },
  mapActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sharingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 14, 
    borderWidth: 1, 
    marginBottom: 16, 
    gap: 12 
  },
  sharingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sharingTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  sharingSub: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  locationCard: { padding: 14, borderRadius: 16, marginBottom: 16 },
  routeItem: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  routeText: { flex: 1, gap: 1 },
  locationLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  locationValue: { fontSize: 12, fontFamily: 'DMSans_700Bold' },
  routeLine: { width: 1, height: 12, marginLeft: 16, marginVertical: 2 },
  sectionTitle: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  statusControls: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  statusBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: { fontSize: 10, fontFamily: 'DMSans_700Bold' },
  actions: { gap: 8 },
  actionBtn: { borderRadius: 10, height: 44 },
  actionBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
  deliveryBtn: { borderRadius: 10, height: 50 },
  helperText: { fontSize: 9, color: '#999', marginTop: 4, textAlign: 'center', fontFamily: 'DMSans_500Medium' },
  cancelBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 10, 
    gap: 6 
  },
  cancelBtnText: { fontWeight: '700', fontSize: 11 },
  completedInfo: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  completedTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  completedSubtitle: { fontSize: 12, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444410', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444' },
  liveText: { fontSize: 7, fontWeight: '900', color: '#EF4444' },
  markerIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  driverMarker: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  driverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', borderWidth: 2, borderColor: 'white', zIndex: 1 },
  driverPulse: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB30' },
});
