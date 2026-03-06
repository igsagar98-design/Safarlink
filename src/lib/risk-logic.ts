/**
 * Risk logic for trip status calculation
 * Configurable thresholds for MVP
 */

// Thresholds (in minutes)
export const RISK_THRESHOLDS = {
  /** Minutes without update before marking "at risk" */
  NO_UPDATE_AT_RISK: 30,
  /** Minutes without update before marking "late" */
  NO_UPDATE_LATE: 90,
  /** Minutes ETA exceeds planned arrival before "at risk" */
  ETA_SLIP_AT_RISK: 30,
  /** Minutes ETA exceeds planned arrival before "late" */
  ETA_SLIP_LATE: 120,
};

export type TripStatus = 'on_time' | 'at_risk' | 'late' | 'delivered';

interface TripForRisk {
  planned_arrival: string;
  current_eta: string | null;
  last_update_at: string | null;
  status: TripStatus;
}

/**
 * Calculate risk status based on ETA and last update time
 * Manual driver status reports override this calculation
 */
export function calculateTripStatus(trip: TripForRisk): TripStatus {
  if (trip.status === 'delivered') return 'delivered';
  // If driver manually reported late, keep it
  if (trip.status === 'late') return 'late';

  const now = new Date();
  const planned = new Date(trip.planned_arrival);
  const minutesSinceUpdate = trip.last_update_at
    ? (now.getTime() - new Date(trip.last_update_at).getTime()) / 60000
    : Infinity;

  // Check no-update thresholds
  if (minutesSinceUpdate >= RISK_THRESHOLDS.NO_UPDATE_LATE) return 'late';
  if (minutesSinceUpdate >= RISK_THRESHOLDS.NO_UPDATE_AT_RISK) return 'at_risk';

  // Check ETA slip
  if (trip.current_eta) {
    const eta = new Date(trip.current_eta);
    const slipMinutes = (eta.getTime() - planned.getTime()) / 60000;
    if (slipMinutes >= RISK_THRESHOLDS.ETA_SLIP_LATE) return 'late';
    if (slipMinutes >= RISK_THRESHOLDS.ETA_SLIP_AT_RISK) return 'at_risk';
  }

  return 'on_time';
}

export function getStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'on_time': return 'On Time';
    case 'at_risk': return 'At Risk';
    case 'late': return 'Late';
    case 'delivered': return 'Delivered';
  }
}

export function getStatusClass(status: TripStatus): string {
  switch (status) {
    case 'on_time': return 'status-badge-on-time';
    case 'at_risk': return 'status-badge-at-risk';
    case 'late': return 'status-badge-late';
    case 'delivered': return 'status-badge-delivered';
  }
}

/** Format relative time like "5 min ago" */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'No updates';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}
