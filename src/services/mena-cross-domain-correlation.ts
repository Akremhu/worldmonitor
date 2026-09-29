import type { MenaEvent } from '@/config/mena/events';
import { getMenaIntelligenceStore } from '@/services/mena-intelligence-store';

export type MenaDomain = 'events' | 'entities' | 'military' | 'maritime' | 'airspace' | 'infrastructure' | 'energy' | 'history';

export interface MenaCrossDomainSignal {
  id: string;
  eventId: string;
  domains: MenaDomain[];
  strength: number;
  reasons: string[];
  entityIds: string[];
  sourceIds: string[];
}

function hash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Conservative convergence heuristic. It never assigns responsibility or intent. */
export function correlateMenaDomains(events: MenaEvent[] = getMenaIntelligenceStore().events): MenaCrossDomainSignal[] {
  const signals: MenaCrossDomainSignal[] = [];
  for (const event of events) {
    const domains: MenaDomain[] = ['events'];
    const reasons: string[] = [];

    if (event.entityIds.length) { domains.push('entities'); reasons.push(`${event.entityIds.length} linked entities`); }
    if (event.eventType === 'military_movement' || event.eventType === 'strike') {
      domains.push('military'); reasons.push('military-related event type');
    }
    if (event.eventType === 'maritime') { domains.push('maritime'); reasons.push('maritime event type'); }
    if (event.eventType === 'airspace') { domains.push('airspace'); reasons.push('airspace event type'); }
    if (event.eventType === 'energy' || event.tags.some(t => /energy|oil|gas|power|pipeline/i.test(t))) {
      domains.push('energy'); reasons.push('energy-related evidence');
    }
    if (event.eventType === 'infrastructure' || event.tags.some(t => /port|airport|cable|pipeline|infrastructure/i.test(t))) {
      domains.push('infrastructure'); reasons.push('infrastructure-related evidence');
    }
    if (event.relatedEventIds.length) { domains.push('history'); reasons.push(`${event.relatedEventIds.length} related event links`); }

    const unique = [...new Set(domains)];
    if (unique.length < 2) continue;
    const strength = Math.min(0.95, 0.45 + unique.length * 0.08 + Math.min(event.sourceIds.length, 3) * 0.05);
    signals.push({
      id: `mena-xdc:${hash(event.id + '|' + unique.join(','))}`,
      eventId: event.id,
      domains: unique,
      strength,
      reasons,
      entityIds: event.entityIds,
      sourceIds: event.sourceIds,
    });
  }
  return signals.sort((a, b) => b.strength - a.strength || a.eventId.localeCompare(b.eventId));
}
