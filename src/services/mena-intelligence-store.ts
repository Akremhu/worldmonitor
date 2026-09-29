import type { MenaEntity } from '@/config/mena/entities';
import type { MenaEvent } from '@/config/mena/events';
import { buildMenaIntelligenceGraph, type MenaGraphSnapshot } from '@/services/mena-intelligence-graph';
import { recordMenaEventVersions } from '@/services/mena-event-history';

export interface MenaIntelligenceStore {
  events: MenaEvent[];
  entities: MenaEntity[];
  graph: MenaGraphSnapshot;
  updatedAt: number;
}

type StoreListener = (store: MenaIntelligenceStore) => void;
const listeners = new Set<StoreListener>();

let store: MenaIntelligenceStore = {
  events: [],
  entities: [],
  graph: { nodes: [], edges: [], generatedAt: 0 },
  updatedAt: 0,
};

export function updateMenaIntelligenceStore(events: readonly MenaEvent[], entities: readonly MenaEntity[]): void {
  const nextEvents = [...events];
  recordMenaEventVersions(nextEvents);
  const nextEntities = [...entities];
  store = {
    events: nextEvents,
    entities: nextEntities,
    graph: buildMenaIntelligenceGraph(nextEvents, nextEntities),
    updatedAt: Date.now(),
  };
  for (const listener of listeners) listener(store);
}

export function subscribeMenaIntelligenceStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMenaIntelligenceStore(): MenaIntelligenceStore {
  return store;
}

export function getMenaEntity(entityId: string): MenaEntity | undefined {
  return store.entities.find(entity => entity.id === entityId);
}

export function getMenaEvent(eventId: string): MenaEvent | undefined {
  return store.events.find(event => event.id === eventId);
}
