/**
 * Canonical MENA event model.
 *
 * This layer normalizes observations from news, official feeds and structured
 * datasets. It deliberately stores evidence and confidence instead of turning
 * an automated interpretation into a fact.
 */

export type MenaEventType =
  | 'conflict' | 'strike' | 'explosion' | 'protest' | 'arrest'
  | 'diplomatic' | 'military_movement' | 'airspace' | 'maritime'
  | 'cyber' | 'infrastructure' | 'energy' | 'economic'
  | 'humanitarian' | 'natural_disaster' | 'other';

export type MenaConfidence = 'unverified' | 'low' | 'medium' | 'high';

export interface MenaEventSource {
  sourceId: string;
  sourceName: string;
  url?: string;
  publishedAt?: number | null;
  fetchedAt?: number | null;
  sourceTier?: 1 | 2 | 3;
}

export interface MenaEventLocation {
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  precision?: 'country' | 'region' | 'city' | 'exact';
}

export interface MenaEvent {
  id: string;
  timestamp: number;
  eventType: MenaEventType;
  title: string;
  summary?: string;
  location?: MenaEventLocation;
  actorIds: string[];
  entityIds: string[];
  sourceIds: string[];
  sources: MenaEventSource[];
  language?: string;
  confidence: MenaConfidence;
  relatedEventIds: string[];
  relatedStoryIds: string[];
  geometry?: { type: 'Point'; coordinates: [number, number] };
  firstSeenAt: number;
  lastUpdatedAt: number;
  status: 'open' | 'updated' | 'closed';
  tags: string[];
}

export function isUsableMenaEvent(event: MenaEvent): boolean {
  return Boolean(
    event.id &&
    event.title.trim() &&
    Number.isFinite(event.timestamp) &&
    event.sources.length > 0 &&
    event.sourceIds.length > 0,
  );
}
