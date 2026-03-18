import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/Colors';

interface RouteProgressProps {
  originAddress: string;
  destinationAddress: string;
  progressPercent: number;
  totalDistance: string;
  remainingDistance: string;
}

const RouteProgress = ({
  originAddress,
  destinationAddress,
  progressPercent,
  totalDistance,
  remainingDistance,
}: RouteProgressProps) => {
  const { colors } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Addresses */}
      <View style={styles.addressRow}>
        <View style={styles.addressBlock}>
          <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>From</Text>
          <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>
            {originAddress}
          </Text>
        </View>
        <View style={[styles.addressBlock, { alignItems: 'flex-end' }]}>
          <Text style={[styles.labelCaps, { color: colors.mutedForeground }]}>To</Text>
          <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>
            {destinationAddress}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${clampedProgress}%` as any,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
          {clampedProgress}% route progress
        </Text>
      </View>

      {/* Distance Row */}
      <View style={styles.distanceRow}>
        <Text style={[styles.distanceText, { color: colors.mutedForeground }]}>
          Total: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{totalDistance}</Text>
        </Text>
        <Text style={[styles.distanceText, { color: colors.mutedForeground }]}>
          Remaining: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{remainingDistance}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  addressBlock: {
    flex: 1,
    gap: 2,
  },
  labelCaps: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceText: {
    fontSize: 12,
  },
});

export default RouteProgress;
