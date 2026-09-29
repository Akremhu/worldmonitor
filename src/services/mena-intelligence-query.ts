import type { MenaEvent } from '@/config/mena/events';
import type { MenaEntity } from '@/config/mena/entities';

export interface MenaEventQuery {
  countryCode?: string;
  eventType?: MenaEvent['eventType'];
  entityId?: string;
  since?: number;
  until?: number;
  confidence?: MenaEvent['confidence'];
  sourceId?: string;
  limit?: number;
}

export function queryMenaEvents(events: readonly MenaEvent[], query: MenaEventQuery = {}): MenaEvent[] {
  const limit = Math.max(1, Math.min(query.limit ?? 100, 500));
  return events
    .filter(event => {
      if (query.countryCode && event.location?.countryCode !== query.countryCode) return false;
      if (query.eventType && event.eventType !== query.eventType) return false;
      if (query.entityId && !event.entityIds.includes(query.entityId) && !event.actorIds.includes(query.entityId)) return false;
      if (query.since !== undefined && event.timestamp < query.since) return false;
      if (query.until !== undefined && event.timestamp > query.until) return false;
      if (query.confidence && event.confidence !== query.confidence) return false;
      if (query.sourceId && !event.sourceIds.includes(query.sourceId)) return false;
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export interface MenaEntityQuery {
  type?: MenaEntity['type'];
  countryCode?: string;
  search?: string;
  limit?: number;
}

export function queryMenaEntities(entities: readonly MenaEntity[], query: MenaEntityQuery = {}): MenaEntity[] {
  const limit = Math.max(1, Math.min(query.limit ?? 100, 500));
  const search = query.search?.toLowerCase().trim();
  return entities
    .filter(entity => {
      if (query.type && entity.type !== query.type) return false;
      if (query.countryCode && !entity.countryCodes.includes(query.countryCode)) return false;
      if (search && ![entity.canonicalName, ...entity.aliases].some(value => value.toLowerCase().includes(search))) return false;
      return true;
    })
    .slice(0, limit);
}
