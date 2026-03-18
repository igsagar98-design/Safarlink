import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Package, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../constants/Colors';

interface TripCardProps {
  tripId: string;
  origin: string;
  destination: string;
  cargo?: string;
  distance?: string;
  vehicleNumber?: string;
  onPress?: () => void;
}

const TripCard = ({
  tripId,
  origin,
  destination,
  cargo,
  distance,
  vehicleNumber,
  onPress,
}: TripCardProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>Trip ID</Text>
          <Text style={[styles.tripId, { color: colors.foreground }]}>#{tripId.slice(0, 8)}</Text>
        </View>
        {vehicleNumber && (
          <View style={[styles.vehicleBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.vehicleText, { color: colors.primary }]}>{vehicleNumber}</Text>
          </View>
        )}
      </View>

      {/* Route */}
      <View style={styles.route}>
        {/* Origin */}
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.routeTextBlock}>
            <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>From</Text>
            <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
              {origin}
            </Text>
          </View>
        </View>

        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />

        {/* Destination */}
        <View style={styles.routeRow}>
          <MapPin size={14} color={colors.danger as string} />
          <View style={styles.routeTextBlock}>
            <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>To</Text>
            <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
              {destination}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      {(cargo || distance) && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {cargo && (
            <View style={styles.footerItem}>
              <Package size={13} color={colors.mutedForeground as string} />
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{cargo}</Text>
            </View>
          )}
          {distance && (
            <View style={styles.footerItem}>
              <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>Distance:</Text>
              <Text style={[styles.footerBold, { color: colors.foreground }]}>{distance}</Text>
            </View>
          )}
          <ArrowRight size={16} color={colors.primary as string} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    gap: 2,
  },
  labelCaps: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tripId: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  vehicleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  route: {
    marginBottom: 16,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeTextBlock: {
    flex: 1,
    gap: 1,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  routeLine: {
    width: 2,
    height: 18,
    marginLeft: 4,
    marginVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerBold: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default TripCard;
