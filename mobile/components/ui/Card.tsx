import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../constants/Colors';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card = ({ children, style }: CardProps) => {
  const { colors } = useTheme();

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.card,
        borderColor: colors.border,
      }, 
      style
     ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, // Premium feel
    borderWidth: 1,
    padding: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Android elevation
    elevation: 2,
  },
});
