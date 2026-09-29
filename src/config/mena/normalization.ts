import type { MenaEvent, MenaEventType, MenaEventLocation } from './events';
import type { MenaEntity, MenaEntityType } from './entities';

const EVENT_KEYWORDS: readonly [MenaEventType, readonly string[]][] = [
  ['strike', ['airstrike', 'air strike', 'missile strike', 'غارة', 'قصف', 'صاروخ']],
  ['explosion', ['explosion', 'blast', 'انفجار']],
  ['protest', ['protest', 'demonstration', 'احتجاج', 'مظاهرة']],
  ['arrest', ['arrested', 'detained', 'اعتقال', 'اعتقلت']],
  ['diplomatic', ['talks', 'meeting', 'agreement', 'ceasefire', 'مفاوضات', 'اتفاق', 'هدنة']],
  ['maritime', ['tanker', 'vessel', 'shipping', 'port', 'ناقلات', 'سفينة', 'ميناء']],
  ['airspace', ['airspace', 'airport', 'flight', 'المجال الجوي', 'مطار', 'رحلة']],
  ['energy', ['oil', 'gas', 'pipeline', 'lng', 'نفط', 'غاز', 'خط أنابيب']],
  ['humanitarian', ['displacement', 'refugee', 'aid', 'humanitarian', 'نازح', 'لاجئ', 'مساعدات']],
  ['cyber', ['cyberattack', 'ransomware', 'malware', 'هجوم سيبراني']],
];

export function classifyMenaEventType(text: string): MenaEventType {
  const normalized = text.toLowerCase();
  let best: MenaEventType = 'other';
  let bestScore = 0;
  for (const [type, keywords] of EVENT_KEYWORDS) {
    const score = keywords.reduce((n, keyword) => n + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) { best = type; bestScore = score; }
  }
  return best;
}

export function normalizeMenaEvent(input: {
  id: string;
  title: string;
  summary?: string;
  timestamp: number;
  sourceId: string;
  sourceName: string;
  sourceTier?: 1 | 2 | 3;
  language?: string;
  location?: MenaEventLocation;
  actorIds?: string[];
  entityIds?: string[];
}): MenaEvent {
  const sources = [{
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    publishedAt: input.timestamp,
    sourceTier: input.sourceTier,
  }];
  return {
    id: input.id,
    timestamp: input.timestamp,
    eventType: classifyMenaEventType(input.title + ' ' + (input.summary ?? '')),
    title: input.title.trim(),
    summary: input.summary?.trim(),
    location: input.location,
    actorIds: [...new Set(input.actorIds ?? [])],
    entityIds: [...new Set(input.entityIds ?? [])],
    sourceIds: [input.sourceId],
    sources,
    language: input.language,
    confidence: 'unverified',
    relatedEventIds: [],
    relatedStoryIds: [],
    firstSeenAt: Date.now(),
    lastUpdatedAt: Date.now(),
    status: 'open',
    tags: [],
  };
}

export function normalizeMenaEntity(input: {
  id: string;
  canonicalName: string;
  type: MenaEntityType;
  aliases?: string[];
  names?: MenaEntity['names'];
  countryCodes?: string[];
  sourceIds?: string[];
}): MenaEntity {
  return {
    id: input.id,
    canonicalName: input.canonicalName.trim(),
    type: input.type,
    countryCodes: [...new Set(input.countryCodes ?? [])],
    names: input.names ?? [],
    aliases: [...new Set(input.aliases ?? [])],
    sourceIds: [...new Set(input.sourceIds ?? [])],
    confidence: 'unverified',
    eventIds: [],
    relatedEntityIds: [],
    metadata: {},
  };
}
