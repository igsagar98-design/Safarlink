import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert
} from 'react-native';
import { useTheme } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import {
  User, Phone, Truck, LogOut
} from 'lucide-react-native';

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primary + '12' }]}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { profile, loading } = useDriverProfile();

  const initial = profile?.fullName?.charAt(0)?.toUpperCase() || 'D';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Avatar Header */}
      <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, { backgroundColor: colors.card }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.heroName}>{profile?.fullName || 'Driver'}</Text>
        <Text style={styles.heroRole}>Active Driver</Text>
      </View>

      {/* Driver Details */}
      <Card style={styles.infoCard}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Account Details</Text>
        <InfoRow
          icon={<User size={16} color={colors.primary as string} />}
          label="Full Name"
          value={profile?.fullName || '—'}
        />
        <InfoRow
          icon={<Phone size={16} color={colors.primary as string} />}
          label="Phone Number"
          value={profile?.phone || '—'}
        />
        <InfoRow
          icon={<Truck size={16} color={colors.primary as string} />}
          label="Vehicle Number"
          value={profile?.vehicleNumber || '—'}
        />
      </Card>

      {/* Actions */}
      <View style={styles.actionSection}>
        <Button
          title="Sign Out"
          variant="destructive"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        >
          <LogOut size={16} color="white" style={{ marginRight: 8 }} />
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 60 },
  heroSection: {
    padding: 32,
    alignItems: 'center',
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    padding: 3,
    marginBottom: 14,
  },
  avatar: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800' },
  heroName: { color: 'white', fontSize: 22, fontWeight: '800' },
  heroRole: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 3 },
  infoCard: { marginHorizontal: 16, marginTop: -20, marginBottom: 16, padding: 0, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, padding: 16, paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  actionSection: { paddingHorizontal: 16, gap: 12, marginTop: 10 },
  signOutBtn: { height: 56 },
});


