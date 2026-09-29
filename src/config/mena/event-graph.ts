import type { MenaEvent, MenaEventSource } from './events';
import type { MenaEntity, MenaEntityRelationship } from './entities';

export interface MenaStoryCluster {
  id: string;
  title: string;
  eventIds: string[];
  sourceIds: string[];
  languages: string[];
  countryCodes: string[];
  firstSeenAt: number;
  lastUpdatedAt: number;
  confidence: 'unverified' | 'low' | 'medium' | 'high';
}

export interface MenaEventGraph {
  events: MenaEvent[];
  entities: MenaEntity[];
  relationships: MenaEntityRelationship[];
  stories: MenaStoryCluster[];
}

export function createMenaEventId(timestamp: number, sourceId: string, fingerprint: string): string {
  const safe = fingerprint.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  return 'me-' + timestamp.toString(36) + '-' + sourceId.replace(/[^a-z0-9-]/gi, '').slice(0, 18) + '-' + safe;
}

export function sourceToEventSource(sourceId: string, sourceName: string, sourceTier?: 1 | 2 | 3): MenaEventSource {
  return { sourceId, sourceName, sourceTier };
}
