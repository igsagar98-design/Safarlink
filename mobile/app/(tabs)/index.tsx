import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../constants/Colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Truck, Link2, Plus
} from 'lucide-react-native';
import { 
  subscribeGpsLink, validateGpsLink, createTrackingSession, resetGpsLink 
} from '../../services/gpsLink';
import { useTrips } from '../../hooks/useTrips';
import { useAuth } from '../../hooks/useAuth';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { useRouter } from 'expo-router';
import { TripCard } from '../../components/Trips/TripCard';

export default function ActiveTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useDriverProfile();
  const { activeTrips, loading, refresh } = useTrips();
  
  const [urlInput, setUrlInput] = useState('');
  const [gpsState, setGpsState] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const unsub = subscribeGpsLink((state) => {
      setGpsState(state);
      if (state.url && !urlInput) {
        setUrlInput(state.url);
      }
    });
    return unsub;
  }, []);

  const handleValidateAndAdd = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Missing Link', 'Please paste a transporter tracking link first.');
      return;
    }
    
    setIsValidating(true);
    const success = await validateGpsLink(urlInput);
    
    if (success && user) {
      try {
        await createTrackingSession(user.id, profile?.companyId);
        setUrlInput('');
        resetGpsLink();
        setShowInput(false);
        Alert.alert('Success', 'Tracking session created and added to Active trips.');
      } catch (err: any) {
        Alert.alert('Error', 'Failed to create tracking session: ' + err.message);
      }
    } else if (!success) {
      Alert.alert('Invalid Link', 'This link doesn\'t seem to be a valid Safarlink tracking URL.');
    }
    setIsValidating(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.primary]} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Active Sessions</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {activeTrips.length} current tracking {activeTrips.length === 1 ? 'trip' : 'trips'}
          </Text>
        </View>

        {/* Action Bar */}
        {!showInput && (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowInput(true)}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addBtnText}>Paste Transporter Link</Text>
          </TouchableOpacity>
        )}

        {/* Input Section (Conditional) */}
        {showInput && (
          <Card style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>NEW TRANSPORTER LINK</Text>
              <TouchableOpacity onPress={() => setShowInput(false)}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <Input
                placeholder="https://safarlink.in/track/..."
                value={urlInput}
                onChangeText={setUrlInput}
                containerStyle={{ flex: 1, marginBottom: 0 }}
                autoCapitalize="none"
              />
            </View>
            
            <Button
              title={isValidating ? "Validating..." : "Add to Active Trips"}
              onPress={handleValidateAndAdd}
              style={styles.mainBtn}
              loading={isValidating}
              disabled={isValidating}
            >
              {!isValidating && <Link2 size={18} color="white" style={{ marginRight: 8 }} />}
            </Button>
          </Card>
        )}

        {/* Trip List */}
        <View style={styles.listContainer}>
          {activeTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted + '20' }]}>
                <Truck size={40} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Active Trips</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Paste a transporter link above to start tracking a new delivery.
              </Text>
            </View>
          ) : (
            activeTrips.map((trip) => (
              <TripCard 
                key={trip.id} 
                trip={trip} 
                onPress={() => router.push(`/trip/${trip.id}`)} 
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2, fontFamily: 'DMSans_500Medium' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  addBtnText: { color: 'white', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  inputCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
  },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  mainBtn: { borderRadius: 12, height: 44 },
  listContainer: { gap: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, fontFamily: 'DMSans_400Regular' },
});


