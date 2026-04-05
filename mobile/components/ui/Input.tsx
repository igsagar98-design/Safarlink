import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { useTheme } from '../../constants/Colors';
import React from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = ({ label, error, containerStyle, ...props }: InputProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
          },
          error && { borderColor: colors.danger }
        ]}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    height: 54, // Taller for drivers
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
