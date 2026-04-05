import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../constants/Colors';
import { Card } from '../ui/Card';
import { Trip } from '../../hooks/useTrips';
import { MapPin, Globe, Clock, ChevronRight, CheckCircle2, XCircle } from 'lucide-react-native';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export const TripCard = ({ trip, onPress }: TripCardProps) => {
  const { colors } = useTheme();

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

  const StatusIcon = trip.status === 'delivered' ? CheckCircle2 : (trip.status === 'cancelled' ? XCircle : Globe);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.tripCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.sourceTag, { backgroundColor: colors.muted + '40' }]}>
            <StatusIcon size={12} color={colors.mutedForeground} />
            <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
              {trip.source_type === 'transporter_link' ? 'Transporter Link' : 'Internal'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15', borderColor: getStatusColor() + '30' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {trip.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.tripId, { color: colors.foreground }]}>ID: {trip.id.slice(0, 8).toUpperCase()}</Text>

        <View style={styles.routeSection}>
          <View style={styles.routeItem}>
            <MapPin size={16} color={colors.primary} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>PICKUP</Text>
              <Text style={[styles.routeValue, { color: colors.foreground }]} numberOfLines={1}>{trip.origin}</Text>
            </View>
          </View>
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={styles.routeItem}>
            <MapPin size={16} color={colors.success} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>DESTINATION</Text>
              <Text style={[styles.routeValue, { color: colors.foreground }]} numberOfLines={1}>{trip.destination}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerItem}>
            <Clock size={14} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              {trip.status === 'delivered' ? 'Delivered' : `ETA: ${trip.current_eta ? new Date(trip.current_eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}`}
            </Text>


          </View>
          <View style={styles.progressSection}>
             <Text style={[styles.progressText, { color: colors.primary }]}>{trip.progress}% Progress</Text>
             <ChevronRight size={16} color={colors.mutedForeground} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tripCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sourceText: { fontSize: 9, fontFamily: 'DMSans_700Bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 9, fontFamily: 'DMSans_700Bold' },
  tripId: { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 16 },
  routeSection: { gap: 10, marginBottom: 16 },
  routeItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeLine: { width: 1, height: 10, marginLeft: 7, borderRadius: 1 },
  routeInfo: { flex: 1, gap: 2 },
  routeLabel: { fontSize: 9, fontFamily: 'DMSans_700Bold' },
  routeValue: { fontSize: 13, fontFamily: 'DMSans_500Medium' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
});
