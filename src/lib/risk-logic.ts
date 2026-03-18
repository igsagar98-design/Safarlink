export type TripStatus = 'on_time' | 'at_risk' | 'late' | 'delivered';

interface TripForRisk {
  planned_arrival: string;
  current_eta: string | null;
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
  const predictedEtaDate = parseTripDate(trip.current_eta);

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

/** Format relative time like "5 min ago" */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'No updates';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}
