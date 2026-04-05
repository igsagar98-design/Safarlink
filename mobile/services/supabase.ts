import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey = 'placeholder-anon-key';

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : fallbackUrl,
  hasSupabaseConfig ? supabaseAnonKey : fallbackAnonKey
);
