/**
 * MENA source-health policy.
 *
 * This is an operator-owned contract: it defines how old a source may be
 * before the UI must stop presenting it as live. It does not claim that a
 * source is trustworthy merely because it is fresh.
 */

export type MenaFreshnessState = 'LIVE' | 'FRESH' | 'AGING' | 'STALE' | 'DEAD';

export interface MenaSourceHealthPolicy {
  id: string;
  name: string;
  region: string;
  language: string[];
  type: 'news' | 'official' | 'humanitarian' | 'maritime' | 'energy' | 'market' | 'aggregator';
  tier: 1 | 2 | 3;
  freshMinutes: number;
  agingMinutes: number;
  staleMinutes: number;
  critical?: boolean;
}

export interface MenaSourceObservation {
  sourceId: string;
  fetchedAt: number | null;
  latestItemAt: number | null;
  httpStatus?: number | null;
  itemCount?: number | null;
  parseOk?: boolean | null;
  latencyMs?: number | null;
}

export interface MenaSourceHealth extends MenaSourceObservation {
  state: MenaFreshnessState;
  ageMinutes: number | null;
  usable: boolean;
}

export const MENA_SOURCE_HEALTH_POLICIES: readonly MenaSourceHealthPolicy[] = [
  { id: 'sanaa-center', name: "Sana'a Center", region: 'Yemen', language: ['en'], type: 'news', tier: 2, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720, critical: true },
  { id: 'yemen-online', name: 'Yemen Online', region: 'Yemen', language: ['ar', 'en'], type: 'news', tier: 3, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720 },
  { id: 'un-yemen', name: 'UN Yemen', region: 'Yemen', language: ['en'], type: 'official', tier: 1, freshMinutes: 360, agingMinutes: 720, staleMinutes: 1440, critical: true },
  { id: 'ocha-yemen', name: 'OCHA Yemen', region: 'Yemen', language: ['en'], type: 'humanitarian', tier: 1, freshMinutes: 360, agingMinutes: 720, staleMinutes: 1440, critical: true },
  { id: 'arab-news', name: 'Arab News', region: 'Gulf', language: ['en', 'ar'], type: 'news', tier: 2, freshMinutes: 90, agingMinutes: 240, staleMinutes: 720 },
  { id: 'the-national', name: 'The National', region: 'Gulf', language: ['en', 'ar'], type: 'news', tier: 2, freshMinutes: 90, agingMinutes: 240, staleMinutes: 720 },
  { id: 'irna', name: 'IRNA', region: 'Iran', language: ['en', 'fa'], type: 'official', tier: 1, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720, critical: true },
  { id: 'mehr', name: 'Mehr News', region: 'Iran', language: ['en', 'fa'], type: 'news', tier: 2, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720 },
  { id: 'bbc-persian', name: 'BBC Persian', region: 'Iran', language: ['fa'], type: 'news', tier: 2, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720 },
  { id: 'jerusalem-post', name: 'Jerusalem Post', region: 'Israel/Palestine', language: ['en'], type: 'news', tier: 2, freshMinutes: 90, agingMinutes: 240, staleMinutes: 720 },
  { id: 'ynetnews', name: 'Ynetnews', region: 'Israel/Palestine', language: ['he', 'en'], type: 'news', tier: 2, freshMinutes: 90, agingMinutes: 240, staleMinutes: 720 },
  { id: 'wafa', name: 'WAFA English', region: 'Israel/Palestine', language: ['en', 'ar'], type: 'official', tier: 1, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720 },
  { id: 'syria-direct', name: 'Syria Direct', region: 'Levant', language: ['en', 'ar'], type: 'news', tier: 2, freshMinutes: 180, agingMinutes: 360, staleMinutes: 720 },
  { id: 'rudaw', name: 'Rudaw', region: 'Iraq/Kurdistan', language: ['en', 'ar', 'ku'], type: 'news', tier: 2, freshMinutes: 120, agingMinutes: 360, staleMinutes: 720 },
  { id: 'ukmto', name: 'UKMTO', region: 'Red Sea', language: ['en'], type: 'maritime', tier: 1, freshMinutes: 60, agingMinutes: 180, staleMinutes: 360, critical: true },
] as const;

export function getMenaFreshnessState(ageMinutes: number | null, policy: MenaSourceHealthPolicy): MenaFreshnessState {
  if (ageMinutes == null || !Number.isFinite(ageMinutes) || ageMinutes < 0) return 'DEAD';
  if (ageMinutes <= policy.freshMinutes) return 'LIVE';
  if (ageMinutes <= policy.agingMinutes) return 'FRESH';
  if (ageMinutes <= policy.staleMinutes) return 'AGING';
  return 'STALE';
}

export function assessMenaSourceHealth(
  observation: MenaSourceObservation,
  policy: MenaSourceHealthPolicy,
  now = Date.now(),
): MenaSourceHealth {
  const latestItemAt = observation.latestItemAt;
  const ageMinutes = latestItemAt == null || !Number.isFinite(latestItemAt)
    ? null
    : Math.round((now - latestItemAt) / 60_000);
  const state = getMenaFreshnessState(ageMinutes, policy);
  const httpFailed = observation.httpStatus != null && (observation.httpStatus < 200 || observation.httpStatus >= 400);
  const parseFailed = observation.parseOk === false;
  return {
    ...observation,
    ageMinutes,
    state,
    usable: !httpFailed && !parseFailed && state !== 'STALE' && state !== 'DEAD',
  };
}
