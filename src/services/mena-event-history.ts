import type { MenaEvent } from '@/config/mena/events';

export interface MenaEventVersion {
  version: number;
  eventId: string;
  recordedAt: number;
  event: MenaEvent;
  changedFields: string[];
  sourceIds: string[];
}

export interface MenaEventHistoryQuery {
  eventId?: string;
  countryCode?: string;
  entityId?: string;
  eventType?: MenaEvent['eventType'];
  sourceId?: string;
  since?: number;
  until?: number;
  limit?: number;
}

const versions = new Map<string, MenaEventVersion[]>();
const fingerprints = new Map<string, string>();

function stableValue(value: unknown): string {
  return JSON.stringify(value);
}

function fingerprint(event: MenaEvent): string {
  return stableValue({
    timestamp: event.timestamp,
    eventType: event.eventType,
    title: event.title,
    summary: event.summary ?? '',
    location: event.location ?? null,
    actorIds: [...event.actorIds].sort(),
    entityIds: [...event.entityIds].sort(),
    sourceIds: [...event.sourceIds].sort(),
    confidence: event.confidence,
    relatedEventIds: [...event.relatedEventIds].sort(),
    relatedStoryIds: [...event.relatedStoryIds].sort(),
    geometry: event.geometry ?? null,
    status: event.status,
    tags: [...event.tags].sort(),
  });
}

function changedFields(previous: MenaEvent | undefined, next: MenaEvent): string[] {
  if (!previous) return ['initial'];
  const fields: Array<keyof MenaEvent> = [
    'timestamp', 'eventType', 'title', 'summary', 'location', 'actorIds',
    'entityIds', 'sourceIds', 'sources', 'confidence', 'relatedEventIds',
    'relatedStoryIds', 'geometry', 'status', 'tags',
  ];
  return fields.filter(field => stableValue(previous[field]) !== stableValue(next[field]));
}

/** Append an event version only when its evidence state actually changes. */
export function recordMenaEventVersions(events: readonly MenaEvent[], recordedAt = Date.now()): void {
  for (const event of events) {
    const nextFingerprint = fingerprint(event);
    if (fingerprints.get(event.id) === nextFingerprint) continue;

    const history = versions.get(event.id) ?? [];
    const previous = history.at(-1)?.event;
    const version: MenaEventVersion = {
      version: history.length + 1,
      eventId: event.id,
      recordedAt,
      event: structuredClone(event),
      changedFields: changedFields(previous, event),
      sourceIds: [...event.sourceIds],
    };

    history.push(version);
    versions.set(event.id, history);
    fingerprints.set(event.id, nextFingerprint);
  }
}

export function queryMenaEventHistory(query: MenaEventHistoryQuery = {}): MenaEventVersion[] {
  const limit = Math.max(1, Math.min(query.limit ?? 100, 500));
  const rows = [...versions.values()].flat();
  return rows
    .filter(row => {
      if (query.eventId && row.eventId !== query.eventId) return false;
      if (query.countryCode && row.event.location?.countryCode !== query.countryCode) return false;
      if (
        query.entityId &&
        !row.event.entityIds.includes(query.entityId) &&
        !row.event.actorIds.includes(query.entityId)
      ) return false;
      if (query.eventType && row.event.eventType !== query.eventType) return false;
      if (query.sourceId && !row.event.sourceIds.includes(query.sourceId)) return false;
      if (query.since !== undefined && row.recordedAt < query.since) return false;
      if (query.until !== undefined && row.recordedAt > query.until) return false;
      return true;
    })
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, limit);
}

export function getMenaEventHistory(eventId: string): MenaEventVersion[] {
  return [...(versions.get(eventId) ?? [])];
}

export function getMenaEventLatestVersion(eventId: string): MenaEventVersion | undefined {
  return versions.get(eventId)?.at(-1);
}

export function clearMenaEventHistory(): void {
  versions.clear();
  fingerprints.clear();
}
