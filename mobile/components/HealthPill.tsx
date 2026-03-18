import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/Colors';

type HealthStatus = 'good' | 'warning' | 'bad';

interface HealthPillProps {
  label: string;
  value: string;
  status: HealthStatus;
}

const HealthPill = ({ label, value, status }: HealthPillProps) => {
  const { colors } = useTheme();

  const statusColor: Record<HealthStatus, string> = {
    good: colors.success as string,
    warning: colors.warning as string,
    bad: colors.danger as string,
  };

  const statusBg: Record<HealthStatus, string> = {
    good: colors.success + '15',
    warning: colors.warning + '15',
    bad: colors.danger + '15',
  };

  return (
    <View style={[styles.pill, { backgroundColor: statusBg[status], borderColor: statusColor[status] + '40' }]}>
      <View style={[styles.dot, { backgroundColor: statusColor[status] }]} />
      <View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}:</Text>
        <Text style={[styles.value, { color: statusColor[status] }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HealthPill;
