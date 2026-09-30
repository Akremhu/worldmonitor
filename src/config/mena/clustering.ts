import type { MenaEvent } from './events';
import type { MenaStoryCluster } from './event-graph';

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 2));
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits++;
  return hits / Math.max(a.size, b.size);
}

/**
 * Conservative story clustering. It only proposes a match when title similarity
 * and temporal proximity agree; the caller can retain both events if uncertain.
 */
export function shouldClusterMenaEvents(a: MenaEvent, b: MenaEvent): boolean {
  const minutes = Math.abs(a.timestamp - b.timestamp) / 60_000;
  if (minutes > 24 * 60) return false;
  const titleScore = overlap(tokenSet(a.title), tokenSet(b.title));
  const sameCountry = a.location?.countryCode && b.location?.countryCode
    ? a.location.countryCode === b.location.countryCode
    : false;
  return titleScore >= 0.42 || (sameCountry && titleScore >= 0.30);
}

export function buildMenaStoryCluster(events: readonly MenaEvent[], id: string): MenaStoryCluster | null {
  if (!events.length) return null;
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  return {
    id,
    title: sorted[0]!.title,
    eventIds: [...new Set(sorted.map((e) => e.id))],
    sourceIds: [...new Set(sorted.flatMap((e) => e.sourceIds))],
    languages: [...new Set(sorted.map((e) => e.language).filter(Boolean) as string[])],
    countryCodes: [...new Set(sorted.map((e) => e.location?.countryCode).filter(Boolean) as string[])],
    firstSeenAt: Math.min(...sorted.map((e) => e.firstSeenAt)),
    lastUpdatedAt: Math.max(...sorted.map((e) => e.lastUpdatedAt)),
    confidence: sorted.some((e) => e.confidence === 'high')
      ? 'high'
      : sorted.some((e) => e.confidence === 'medium')
        ? 'medium'
        : sorted.some((e) => e.confidence === 'low')
          ? 'low'
          : 'unverified',
  };
}
