import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../constants/Colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { hasSupabaseConfig, supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';
import { Truck } from 'lucide-react-native';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!hasSupabaseConfig) {
      Alert.alert('Configuration Required', 'Supabase keys are missing in this build. Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS environment variables and rebuild.');
      return;
    }

    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    
    // Generate the same derived email used during signup
    const emailFromPhone = `driver_${cleanPhone}@safarlink.in`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailFromPhone,
      password,
    });

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
             <Truck size={40} color="white" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Safarlink Driver</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to start your delivery trips
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number"
            placeholder="9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
            size="lg"
          />

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
           <TouchableOpacity
             onPress={() => router.push('/(auth)/signup')}
             style={styles.signupLink}
           >
             <Text style={{ color: colors.mutedForeground }}>
               New driver?{' '}
               <Text style={{ color: colors.primary, fontWeight: '700' }}>Create an Account</Text>
             </Text>
           </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  loginBtn: {
    marginTop: 10,
  },
  forgotBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  signupLink: {
    paddingVertical: 8,
  },
});
