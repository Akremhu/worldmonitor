import { describe, expect, it } from 'vitest';
import type { MenaEvent } from '@/config/mena/events';
import { correlateMenaDomains } from '@/services/mena-cross-domain-correlation';

function event(overrides: Partial<MenaEvent> = {}): MenaEvent {
  return {
    id: 'mena:test:1',
    timestamp: Date.now(),
    eventType: 'strike',
    title: 'Test regional event',
    summary: 'Synthetic test event',
    location: { countryCode: 'YE', countryName: 'Yemen' },
    actorIds: [],
    entityIds: ['mena-entity:test'],
    sourceIds: ['source:test'],
    sources: [],
    language: 'en',
    confidence: 0.8,
    relatedEventIds: [],
    relatedStoryIds: [],
    firstSeenAt: Date.now(),
    lastUpdatedAt: Date.now(),
    status: 'active',
    tags: [],
    ...overrides,
  };
}

describe('MENA cross-domain correlation', () => {
  it('derives conservative domain convergence from event evidence', () => {
    const [signal] = correlateMenaDomains([
      event({
        eventType: 'energy',
        tags: ['pipeline'],
        relatedEventIds: ['mena:test:older'],
        sourceIds: ['s1', 's2'],
      }),
    ]);

    expect(signal.domains).toEqual([
      'events',
      'entities',
      'energy',
      'infrastructure',
      'history',
    ]);
    expect(signal.strength).toBeLessThanOrEqual(0.95);
    expect(signal.sourceIds).toEqual(['s1', 's2']);
  });

  it('does not manufacture a signal for an isolated event', () => {
    const signals = correlateMenaDomains([
      event({ entityIds: [], eventType: 'other', tags: [] }),
    ]);

    expect(signals).toHaveLength(0);
  });

  it('produces deterministic signal ids', () => {
    const input = [event({ id: 'mena:test:deterministic' })];
    expect(correlateMenaDomains(input)[0]?.id)
      .toBe(correlateMenaDomains(input)[0]?.id);
  });
});
