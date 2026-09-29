/**
 * MENA event adapter for the durable intelHistory store.
 *
 * This module is server-side only. It deliberately delegates embedding,
 * batching, retry, relay authentication and fail-open semantics to
 * _seed-history.mjs rather than duplicating that infrastructure.
 */

import { appendSeedHistory } from './_seed-history.mjs';

export const MENA_HISTORY_DOMAIN = 'mena';
export const MENA_HISTORY_RESOURCE = 'events';

function finiteOrUndefined(value) {
  return Number.isFinite(value) ? value : undefined;
}

function safeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Project one canonical MenaEvent into the generic durable history envelope.
 *
 * The identity remains the canonical event id. Structured MENA fields are
 * preserved in metadata so historical reads can reconstruct the event without
 * abusing title/summary fields or creating a second persistence table.
 */
export function menaEventToHistoryRecord(event) {
  if (!event || typeof event !== 'object') return null;

  const id = safeString(event.id);
  const title = safeString(event.title);
  const occurredAt = finiteOrUndefined(event.timestamp);
  if (!id || !title || occurredAt === undefined) return null;

  const sources = Array.isArray(event.sources)
    ? event.sources.slice(0, 32).map((source) => ({
        id: safeString(source?.id),
        name: safeString(source?.name),
        publishedAt: finiteOrUndefined(source?.publishedAt),
        fetchedAt: finiteOrUndefined(source?.fetchedAt),
        sourceTier: Number.isFinite(source?.sourceTier) ? source.sourceTier : undefined,
        url: safeString(source?.url),
      })).filter((source) => source.id || source.name)
    : [];

  const location = event.location && typeof event.location === 'object'
    ? {
        countryCode: safeString(event.location.countryCode),
        countryName: safeString(event.location.countryName),
        city: safeString(event.location.city),
        region: safeString(event.location.region),
        latitude: finiteOrUndefined(event.location.latitude),
        longitude: finiteOrUndefined(event.location.longitude),
      }
    : undefined;

  const metadata = {
    schemaVersion: 1,
    eventId: id,
    eventType: safeString(event.eventType),
    language: safeString(event.language),
    confidence: Number.isFinite(event.confidence) ? event.confidence : undefined,
    status: safeString(event.status),
    location,
    actorIds: Array.isArray(event.actorIds) ? event.actorIds.slice(0, 64) : [],
    entityIds: Array.isArray(event.entityIds) ? event.entityIds.slice(0, 128) : [],
    sourceIds: Array.isArray(event.sourceIds) ? event.sourceIds.slice(0, 128) : [],
    sources,
    relatedEventIds: Array.isArray(event.relatedEventIds) ? event.relatedEventIds.slice(0, 64) : [],
    relatedStoryIds: Array.isArray(event.relatedStoryIds) ? event.relatedStoryIds.slice(0, 64) : [],
    geometry: event.geometry ?? undefined,
    firstSeenAt: finiteOrUndefined(event.firstSeenAt),
    lastUpdatedAt: finiteOrUndefined(event.lastUpdatedAt),
    tags: Array.isArray(event.tags) ? event.tags.slice(0, 64) : [],
  };

  const country = safeString(event.location?.countryCode);
  const category = safeString(event.eventType);
  const sourceUrl = sources.find((source) => source?.url)?.url;

  return {
    dedupeKey: `mena:events:${id}`,
    country,
    category,
    title,
    summary: safeString(event.summary),
    sourceUrl: safeString(sourceUrl),
    occurredAt,
    metadata,
  };
}

/**
 * Build an afterPublish hook for a MENA collector.
 *
 * The collector remains responsible for fetching/normalizing events. This
 * helper owns only the durable-history projection.
 */
export function makeMenaHistoryAfterPublish({ buildEvents }) {
  if (typeof buildEvents !== 'function') {
    throw new TypeError('makeMenaHistoryAfterPublish: buildEvents must be a function');
  }

  return async function afterPublish(data, meta, deps = {}) {
    const events = buildEvents(data);
    const records = Array.isArray(events)
      ? events.map(menaEventToHistoryRecord).filter(Boolean)
      : [];

    const append = deps.append ?? appendSeedHistory;
    return append({
      domain: MENA_HISTORY_DOMAIN,
      resource: MENA_HISTORY_RESOURCE,
      runId: String(meta?.runId ?? ''),
      records,
    });
  };
}
