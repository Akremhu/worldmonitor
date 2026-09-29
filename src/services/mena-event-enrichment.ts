import type { MenaEvent } from '@/config/mena/events';
import type { MenaEntity } from '@/config/mena/entities';
import { extractMenaEntityCandidates, upsertMenaEntity } from '@/services/mena-entity-extraction';

export function enrichMenaEventsWithEntities(
  events: readonly MenaEvent[],
  existingEntities: readonly MenaEntity[] = [],
): { events: MenaEvent[]; entities: MenaEntity[] } {
  const entities = new Map(existingEntities.map(entity => [entity.canonicalName, entity]));
  const enrichedEvents: MenaEvent[] = [];

  for (const event of events) {
    const candidates = extractMenaEntityCandidates([event.title, event.summary ?? ''].join(' '));
    const eventEntityIds: string[] = [];
    for (const candidate of candidates) {
      const current = entities.get(candidate.canonicalName);
      const entity = upsertMenaEntity(current, candidate, event.id, event.sourceIds[0], event.lastUpdatedAt);
      entities.set(entity.canonicalName, entity);
      eventEntityIds.push(entity.id);
    }
    enrichedEvents.push({
      ...event,
      entityIds: [...new Set([...event.entityIds, ...eventEntityIds])],
      actorIds: [...new Set([...event.actorIds, ...eventEntityIds])],
    });
  }

  return { events: enrichedEvents, entities: [...entities.values()] };
}
