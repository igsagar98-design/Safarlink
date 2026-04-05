import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { useTheme } from '../../constants/Colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { hasSupabaseConfig, supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';
import { Truck, User, Phone, Hash, Building2, Lock, CheckCircle2 } from 'lucide-react-native';

interface FormErrors {
  fullName?: string;
  phone?: string;
  vehicleNumber?: string;
  companyName?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name';
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'Transport company name is required';
    }
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    if (!hasSupabaseConfig) {
      Alert.alert(
        'Not Configured',
        'Supabase is not configured. Add your keys in the .env file and restart.'
      );
      return;
    }

    setLoading(true);
    try {
      // Use phone as login identifier by creating a derived email
      const emailFromPhone = `driver_${phone.replace(/\D/g, '')}@safarlink.in`;

      const { data, error } = await supabase.auth.signUp({
        email: emailFromPhone,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone,
            vehicle_number: vehicleNumber.trim().toUpperCase(),
            company_name: companyName.trim(),
            role: 'transporter',
            account_type: 'transporter',
          },
        },
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else {
        // TODO: Insert driver profile row into `profiles` table here
        // TODO: Create/link transporter company record
        Alert.alert(
          'Account Created! 🎉',
          'Your driver account has been created. You can now sign in.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <Truck size={40} color="white" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Join Safarlink as a professional driver
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, { backgroundColor: colors.primary + '15' }]}>
              <User size={18} color={colors.primary as string} />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Full Name"
                placeholder="Raju Kumar"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors(e => ({ ...e, fullName: undefined })); }}
                autoCapitalize="words"
                error={errors.fullName}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, { backgroundColor: colors.primary + '15' }]}>
              <Phone size={18} color={colors.primary as string} />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Phone Number"
                placeholder="9876543210"
                value={phone}
                onChangeText={(t) => { setPhone(t); setErrors(e => ({ ...e, phone: undefined })); }}
                keyboardType="phone-pad"
                error={errors.phone}
              />
            </View>
          </View>

          {/* Vehicle Number */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, { backgroundColor: colors.warning + '20' }]}>
              <Hash size={18} color={colors.warning as string} />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Vehicle Number"
                placeholder="MH12AB1234"
                value={vehicleNumber}
                onChangeText={(t) => { setVehicleNumber(t.toUpperCase()); setErrors(e => ({ ...e, vehicleNumber: undefined })); }}
                autoCapitalize="characters"
                error={errors.vehicleNumber}
              />
            </View>
          </View>

          {/* Transport Company Name */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, { backgroundColor: colors.success + '20' }]}>
              <Building2 size={18} color={colors.success as string} />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Transport Company Name"
                placeholder="Shri Ganesh Logistics"
                value={companyName}
                onChangeText={(t) => { setCompanyName(t); setErrors(e => ({ ...e, companyName: undefined })); }}
                autoCapitalize="words"
                error={errors.companyName}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <Text style={[styles.dividerText, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
              Set Password
            </Text>
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, { backgroundColor: colors.muted }]}>
              <Lock size={18} color={colors.mutedForeground as string} />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }}
                secureTextEntry
                error={errors.password}
              />
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIcon, {
              backgroundColor: confirmPassword && confirmPassword === password
                ? colors.success + '20'
                : colors.muted
            }]}>
              <CheckCircle2
                size={18}
                color={
                  confirmPassword && confirmPassword === password
                    ? colors.success as string
                    : colors.mutedForeground as string
                }
              />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: undefined })); }}
                secureTextEntry
                error={errors.confirmPassword}
              />
            </View>
          </View>

          {/* Submit */}
          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={styles.createBtn}
          />

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={{ color: colors.mutedForeground }}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inputIcon: {
    width: 40,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24, // align with input label+field combo
    flexShrink: 0,
  },
  inputField: {
    flex: 1,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 20,
    alignItems: 'center',
    position: 'relative',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
    marginTop: -9,
  },
  createBtn: {
    marginTop: 8,
    borderRadius: 16,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
