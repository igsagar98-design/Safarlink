import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react-native';
import { useTheme } from '../constants/Colors';

type TripStatus = 'on_route' | 'at_pickup' | 'delivered';

interface StatusButtonsProps {
  activeStatus: TripStatus;
  onStatusChange: (status: TripStatus) => void;
}

const STATUS_OPTIONS: {
  id: TripStatus;
  label: string;
  Icon: typeof CheckCircle2;
  color: keyof ReturnType<typeof useTheme>['colors'];
}[] = [
  { id: 'on_route', label: 'On Route', Icon: AlertTriangle, color: 'warning' },
  { id: 'at_pickup', label: 'At Pickup', Icon: CheckCircle2, color: 'primary' },
  { id: 'delivered', label: 'Delivered', Icon: CheckCircle2, color: 'success' },
];

const StatusButtons = ({ activeStatus, onStatusChange }: StatusButtonsProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Update Trip Status</Text>
      <View style={styles.grid}>
        {STATUS_OPTIONS.map(({ id, label, Icon, color }) => {
          const isActive = activeStatus === id;
          const activeColor = colors[color] as string;

          return (
            <TouchableOpacity
              key={id}
              onPress={() => onStatusChange(id)}
              activeOpacity={0.75}
              style={[
                styles.btn,
                {
                  backgroundColor: isActive ? activeColor : colors.card,
                  borderColor: isActive ? activeColor : colors.border,
                  shadowColor: isActive ? activeColor : 'transparent',
                },
              ]}
            >
              <Icon
                size={18}
                color={isActive ? (colors.primaryForeground as string) : (activeColor)}
              />
              <Text
                style={[
                  styles.btnText,
                  { color: isActive ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 68,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default StatusButtons;
