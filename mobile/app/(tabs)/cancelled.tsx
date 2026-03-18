import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../constants/Colors';
import { useTrips } from '../../hooks/useTrips';
import { TripCard } from '../../components/Trips/TripCard';
import { XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CancelledTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const { cancelledTrips, loading, refresh } = useTrips();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Cancelled Trips</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {cancelledTrips.length} cancelled tracking {cancelledTrips.length === 1 ? 'trip' : 'trips'}
          </Text>
        </View>

        <View style={styles.listContainer}>
          {cancelledTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.destructive + '15' }]}>
                <XCircle size={40} color={colors.destructive} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Cancelled Trips</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Trips will appear here once they are marked as Cancelled.
              </Text>
            </View>
          ) : (
            cancelledTrips.map((trip) => (
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
  content: { padding: 20, paddingBottom: 60 },
  header: {
    marginTop: 10,
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  listContainer: { gap: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});
