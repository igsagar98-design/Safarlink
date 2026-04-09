export type TripStatus = 'on_time' | 'at_risk' | 'late' | 'delivered';

interface TripForRisk {
  planned_arrival: string;
  predicted_eta_at?: string | null;
  current_eta?: string | null;
  status: TripStatus;
}

const AT_RISK_WINDOW_MS = 2 * 60 * 60 * 1000;
const MIN_PREDICTED_DELAY_FOR_RISK_MS = 30 * 60 * 1000;

const STATUS_SEVERITY: Record<TripStatus, number> = {
  on_time: 0,
  at_risk: 1,
  late: 2,
  delivered: 3,
};

const hasExplicitTimezone = (value: string): boolean => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

function parseTripDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  if (hasExplicitTimezone(raw)) {
    const zoned = new Date(raw);
    return Number.isNaN(zoned.getTime()) ? null : zoned;
  }

  // Parse timezone-less values as local time for deterministic browser behavior.
  const localMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/
  );
  if (!localMatch) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, y, m, d, hh, mm, ss = '0', ms = '0'] = localMatch;
  const localDate = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss),
    Number(ms.padEnd(3, '0'))
  );

  return Number.isNaN(localDate.getTime()) ? null : localDate;
}

function statusFromTargetTime(targetTime: Date, now: Date): Exclude<TripStatus, 'delivered'> {
  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'late';
  if (diffMs <= AT_RISK_WINDOW_MS) return 'at_risk';
  return 'on_time';
}

function pickStrongerStatus(
  a: Exclude<TripStatus, 'delivered'>,
  b: Exclude<TripStatus, 'delivered'>
): Exclude<TripStatus, 'delivered'> {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b;
}

/**
 * Computes the trip status using time-to-target rules:
 * - past target => late
 * - within 2h => at_risk
 * - beyond 2h => on_time
 *
 * If a stronger explicit status already exists on the trip,
 * we keep the stronger one (except delivered, which always wins).
 */
export function calculateTripStatus(trip: TripForRisk): TripStatus {
  if (trip.status === 'delivered') return 'delivered';

  const now = new Date();

  const plannedArrivalDate = parseTripDate(trip.planned_arrival);
  // Source the predicted ETA from the unified backend field first, fall back to legacy if needed
  const predictedEtaDate = parseTripDate(trip.predicted_eta_at || trip.current_eta);

  const plannedStatus = plannedArrivalDate
    ? statusFromTargetTime(plannedArrivalDate, now)
    : 'on_time';

  let predictedStatus: Exclude<TripStatus, 'delivered'> = 'on_time';

  // Only let predicted ETA raise risk when the prediction is materially later than plan.
  if (plannedArrivalDate && predictedEtaDate) {
    const predictedDelayMs = predictedEtaDate.getTime() - plannedArrivalDate.getTime();

    if (predictedDelayMs > MIN_PREDICTED_DELAY_FOR_RISK_MS) {
      predictedStatus = statusFromTargetTime(predictedEtaDate, now);
      if (predictedStatus === 'on_time') {
        predictedStatus = 'at_risk';
      }
    }
  } else if (!plannedArrivalDate && predictedEtaDate) {
    predictedStatus = statusFromTargetTime(predictedEtaDate, now);
  }

  const scheduleStatus = pickStrongerStatus(plannedStatus, predictedStatus);

  const explicitStatus: Exclude<TripStatus, 'delivered'> =
    trip.status === 'late' || trip.status === 'at_risk' ? trip.status : 'on_time';

  return pickStrongerStatus(explicitStatus, scheduleStatus);
}

export function getStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'on_time':
      return 'On Time';
    case 'at_risk':
      return 'At Risk';
    case 'late':
      return 'Late';
    case 'delivered':
      return 'Delivered';
  }
}

export function getStatusClass(status: TripStatus): string {
  switch (status) {
    case 'on_time':
      return 'status-badge-on-time';
    case 'at_risk':
      return 'status-badge-at-risk';
    case 'late':
      return 'status-badge-late';
    case 'delivered':
      return 'status-badge-delivered';
  }
}

/** 
 * Computes delay based on Planned Arrival vs Predicted ETA 
 */
export function calculateDelayMinutes(planned: string, predicted: string | null | undefined): number {
  if (!planned || !predicted) return 0;
  const pDate = new Date(planned);
  const eDate = new Date(predicted);
  if (isNaN(pDate.getTime()) || isNaN(eDate.getTime())) return 0;
  
  const diffMs = eDate.getTime() - pDate.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/** 
 * User-friendly delay formatting (e.g., "9h 33m delayed") 
 */
export function formatDelay(minutes: number): string {
  if (minutes <= 0) return 'No delay predicted';
  if (minutes < 60) return `${minutes} min delayed`;
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remainingHrs = hrs % 24;
    if (remainingHrs === 0) return `${days}d delayed`;
    return `${days}d ${remainingHrs}h delayed`;
  }
  
  if (mins === 0) return `${hrs}h delayed`;
  return `${hrs}h ${mins}m delayed`;
}

/** 
 * Returns just the duration string (e.g., "9h 33m") for use in sentences.
 */
export function formatDelayDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remainingHrs = hrs % 24;
    if (remainingHrs === 0) return `${days}d`;
    return `${days}d ${remainingHrs}h`;
  }
  
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
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
