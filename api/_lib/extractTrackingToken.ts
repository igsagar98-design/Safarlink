const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TokenExtractionResult {
  token: string | null;
  source: 'query' | 'path' | 'raw' | 'last-segment' | 'none';
  reason?: string;
}

function normalizeCandidate(input: string): string {
  return decodeURIComponent(input.trim()).replace(/^['\"]|['\"]$/g, '');
}

function isToken(candidate: string): boolean {
  return UUID_V4_REGEX.test(candidate);
}

function fromUrlPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const driverIndex = segments.findIndex((segment) => segment.toLowerCase() === 'driver');
  if (driverIndex >= 0 && segments[driverIndex + 1]) {
    const candidate = normalizeCandidate(segments[driverIndex + 1]);
    if (isToken(candidate)) {
      return candidate;
    }
  }

  const last = normalizeCandidate(segments[segments.length - 1]);
  return isToken(last) ? last : null;
}

export function extractTrackingToken(input: string | null | undefined): TokenExtractionResult {
  if (!input || !input.trim()) {
    return { token: null, source: 'none', reason: 'Link is empty' };
  }

  const normalizedInput = input.trim();

  const rawCandidate = normalizeCandidate(normalizedInput);
  if (isToken(rawCandidate)) {
    return { token: rawCandidate, source: 'raw' };
  }

  const maybeUrl = normalizedInput.startsWith('http://') || normalizedInput.startsWith('https://')
    ? normalizedInput
    : normalizedInput.includes('/') || normalizedInput.includes('?')
      ? `https://dummy.local/${normalizedInput.replace(/^\/+/, '')}`
      : null;

  if (maybeUrl) {
    try {
      const parsed = new URL(maybeUrl);

      const queryToken = parsed.searchParams.get('token') || parsed.searchParams.get('tracking_token');
      if (queryToken) {
        const candidate = normalizeCandidate(queryToken);
        if (isToken(candidate)) {
          return { token: candidate, source: 'query' };
        }
      }

      const fromPath = fromUrlPath(parsed.pathname);
      if (fromPath) {
        return {
          token: fromPath,
          source: parsed.pathname.toLowerCase().includes('/driver/') ? 'path' : 'last-segment',
        };
      }
    } catch {
      // Fall through to permissive extraction below.
    }
  }

  const fallbackSegments = normalizedInput.split(/[/?#&=\s]+/).filter(Boolean);
  for (let index = fallbackSegments.length - 1; index >= 0; index -= 1) {
    const candidate = normalizeCandidate(fallbackSegments[index]);
    if (isToken(candidate)) {
      return { token: candidate, source: 'last-segment' };
    }
  }

  return {
    token: null,
    source: 'none',
    reason: 'No valid tracking token found in provided link',
  };
}
