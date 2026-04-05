import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useTheme } from '../constants/Colors';

interface TrackingHUDProps {
  tripId: string;
  elapsed: string;
  origin: string;
  destination: string;
  isActive: boolean;
}

const TrackingHUD = ({ tripId, elapsed, origin, destination, isActive }: TrackingHUDProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.card, 
      borderColor: isActive ? colors.primary + '60' : colors.border,
      borderWidth: isActive ? 2 : 1,
    }]}>
      {/* Header: Active Trip label + pulse */}
      <View style={styles.topRow}>
        <View style={styles.activeBadge}>
          <View style={[styles.pulse, { backgroundColor: isActive ? colors.success : colors.danger }]} />
          <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>Active Trip</Text>
        </View>
        <Text style={[styles.elapsed, { color: colors.primary }]}>{elapsed}</Text>
      </View>

      {/* Trip ID */}
      <Text style={[styles.tripId, { color: colors.foreground }]}>#{tripId.slice(0, 8)}</Text>

      {/* Route Summary */}
      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>From</Text>
            <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
              {origin}
            </Text>
          </View>
        </View>
        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
        <View style={styles.routePoint}>
          <Navigation size={14} color={colors.danger as string} />
          <View>
            <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>To</Text>
            <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
              {destination}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelCaps: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  elapsed: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  tripId: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  routeContainer: {
    gap: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  routeLine: {
    width: 2,
    height: 16,
    marginLeft: 4,
    marginVertical: 2,
  },
});

export default TrackingHUD;
