import type { MenaEntity, MenaEntityRelationship, MenaRelationshipType } from '@/config/mena/entities';
import type { MenaEvent } from '@/config/mena/events';
import { createMenaEventId } from '@/config/mena/event-graph';

export interface MenaGraphNode {
  id: string;
  kind: 'event' | 'entity' | 'story';
  label: string;
  type?: string;
  confidence?: string;
}

export interface MenaGraphEdge {
  id: string;
  from: string;
  to: string;
  type: MenaRelationshipType | 'event_entity' | 'event_story' | 'story_entity';
  confidence: string;
  sourceIds: string[];
}

export interface MenaGraphSnapshot {
  nodes: MenaGraphNode[];
  edges: MenaGraphEdge[];
  generatedAt: number;
}

function edgeId(from: string, to: string, type: string): string {
  return 'me-edge-' + createMenaEventId(Date.now(), type, from + ':' + to).slice(3);
}

export function buildMenaIntelligenceGraph(
  events: readonly MenaEvent[],
  entities: readonly MenaEntity[],
  relationships: readonly MenaEntityRelationship[] = [],
): MenaGraphSnapshot {
  const nodes: MenaGraphNode[] = [];
  const edges: MenaGraphEdge[] = [];
  const seenNodes = new Set<string>();
  const addNode = (node: MenaGraphNode) => {
    if (!seenNodes.has(node.id)) {
      seenNodes.add(node.id);
      nodes.push(node);
    }
  };

  for (const entity of entities) {
    addNode({
      id: entity.id,
      kind: 'entity',
      label: entity.canonicalName,
      type: entity.type,
      confidence: entity.confidence,
    });
  }

  for (const event of events) {
    addNode({
      id: event.id,
      kind: 'event',
      label: event.title,
      type: event.eventType,
      confidence: event.confidence,
    });

    for (const entityId of [...new Set([...event.entityIds, ...event.actorIds])]) {
      if (!entities.some(entity => entity.id === entityId)) continue;
      edges.push({
        id: edgeId(event.id, entityId, 'event_entity'),
        from: event.id,
        to: entityId,
        type: 'event_entity',
        confidence: event.confidence,
        sourceIds: event.sourceIds,
      });
    }
  }

  for (const relationship of relationships) {
    edges.push({
      id: relationship.id,
      from: relationship.fromEntityId,
      to: relationship.toEntityId,
      type: relationship.type,
      confidence: relationship.confidence,
      sourceIds: relationship.sourceIds,
    });
  }

  return { nodes, edges, generatedAt: Date.now() };
}

export function getEntityEvents(entityId: string, events: readonly MenaEvent[]): MenaEvent[] {
  return events.filter(event => event.entityIds.includes(entityId) || event.actorIds.includes(entityId));
}

export function getEventEntities(eventId: string, events: readonly MenaEvent[], entities: readonly MenaEntity[]): MenaEntity[] {
  const event = events.find(item => item.id === eventId);
  if (!event) return [];
  const ids = new Set([...event.entityIds, ...event.actorIds]);
  return entities.filter(entity => ids.has(entity.id));
}
