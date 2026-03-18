import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../constants/Colors';
import React from 'react';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button = ({
  onPress,
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { container: { backgroundColor: colors.secondary }, text: { color: colors.secondaryForeground } };
      case 'outline':
        return { container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }, text: { color: colors.foreground } };
      case 'ghost':
        return { container: { backgroundColor: 'transparent' }, text: { color: colors.foreground } };
      case 'destructive':
        return { container: { backgroundColor: colors.destructive }, text: { color: colors.destructiveForeground } };
      default:
        return { container: { backgroundColor: colors.primary }, text: { color: colors.primaryForeground } };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: { paddingVertical: 5, paddingHorizontal: 10 }, text: { fontSize: 12 } };
      case 'lg':
        return { container: { paddingVertical: 12, paddingHorizontal: 24 }, text: { fontSize: 16 } };
      default:
        return { container: { paddingVertical: 10, paddingHorizontal: 16 }, text: { fontSize: 14 } };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        (disabled || loading) && { opacity: 0.5 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {children}
          {title && <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>{title}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12, // More rounded for mobile touch
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700', // Bolder for clarity
    textAlign: 'center',
  }
});
