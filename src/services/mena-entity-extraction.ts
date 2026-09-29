import type { MenaEntity, MenaEntityType } from '@/config/mena/entities';\n\nfunction createStableMenaEntityId(value: string): string {\n  let hash = 2166136261;\n  for (const char of value.normalize('NFKC')) {\n    hash ^= char.codePointAt(0) ?? 0;\n    hash = Math.imul(hash, 16777619);\n  }\n  return 'me-entity-' + (hash >>> 0).toString(16);\n}\n

export interface MenaEntityCandidate {
  canonicalName: string;
  type: MenaEntityType;
  aliases: string[];
  countryCodes: string[];
  confidence: 'unverified' | 'low' | 'medium' | 'high';
  matchedTerms: string[];
}

const ENTITY_PATTERNS: readonly {
  type: MenaEntityType;
  confidence: MenaEntityCandidate['confidence'];
  terms: readonly string[];
}[] = [
  { type: 'government', confidence: 'medium', terms: ['government', 'ministry', 'حكومة', 'وزارة'] },
  { type: 'armed_group', confidence: 'medium', terms: ['houthi', 'houthis', 'أنصار الله', 'الحوثي', 'حزب الله', 'hezbollah', 'hamas', 'حماس'] },
  { type: 'military_entity', confidence: 'medium', terms: ['army', 'armed forces', 'military', 'الجيش', 'القوات المسلحة'] },
  { type: 'political_entity', confidence: 'low', terms: ['party', 'political party', 'حزب سياسي'] },
  { type: 'organization', confidence: 'low', terms: ['united nations', 'un', 'الأمم المتحدة', 'ناتو', 'nato'] },
  { type: 'company', confidence: 'low', terms: ['aramco', 'aramco', 'أرامكو'] },
  { type: 'port', confidence: 'low', terms: ['port', 'ميناء'] },
  { type: 'airport', confidence: 'low', terms: ['airport', 'مطار'] },
];

const ALIAS_CANONICAL: readonly [string, string][] = [
  ['houthis', 'Ansar Allah / Houthis'],
  ['houthi', 'Ansar Allah / Houthis'],
  ['أنصار الله', 'أنصار الله / الحوثيون'],
  ['الحوثي', 'أنصار الله / الحوثيون'],
  ['hezbollah', 'Hezbollah'],
  ['حزب الله', 'حزب الله'],
  ['hamas', 'Hamas'],
  ['حماس', 'حماس'],
  ['united nations', 'United Nations'],
  ['الأمم المتحدة', 'الأمم المتحدة'],
  ['aramco', 'Saudi Aramco'],
  ['أرامكو', 'أرامكو السعودية'],
];

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim();
}

export function extractMenaEntityCandidates(text: string): MenaEntityCandidate[] {
  const value = normalize(text);
  const candidates = new Map<string, MenaEntityCandidate>();

  for (const [alias, canonical] of ALIAS_CANONICAL) {
    if (!value.includes(normalize(alias))) {
      continue;
    }
    const type = canonical.toLowerCase().includes('aramco') || canonical.includes('أرامكو')
      ? 'company'
      : canonical.toLowerCase().includes('houthi') || canonical.includes('الحوث')
        ? 'armed_group'
        : canonical.toLowerCase().includes('hezbollah') || canonical.includes('حزب الله') || canonical.toLowerCase().includes('hamas')
          ? 'armed_group'
          : 'organization';

    candidates.set(canonical, {
      canonicalName: canonical,
      type,
      aliases: [alias],
      countryCodes: [],
      confidence: 'medium',
      matchedTerms: [alias],
    });
  }

  for (const pattern of ENTITY_PATTERNS) {
    const matches = pattern.terms.filter(term => value.includes(normalize(term)));
    if (!matches.length) continue;
    const canonicalName = matches[0];
    const existing = candidates.get(canonicalName);
    candidates.set(canonicalName, {
      canonicalName,
      type: existing?.type ?? pattern.type,
      aliases: [...new Set([...(existing?.aliases ?? []), ...matches])],
      countryCodes: existing?.countryCodes ?? [],
      confidence: existing?.confidence ?? pattern.confidence,
      matchedTerms: [...new Set([...(existing?.matchedTerms ?? []), ...matches])],
    });
  }

  return [...candidates.values()];
}

export function upsertMenaEntity(existing: MenaEntity | undefined, candidate: MenaEntityCandidate, eventId: string, sourceId: string, now = Date.now()): MenaEntity {
  if (!existing) {
    return {
      id: createStableMenaEntityId(candidate.canonicalName),
      canonicalName: candidate.canonicalName,
      type: candidate.type,
      countryCodes: [...candidate.countryCodes],
      names: candidate.aliases.map(value => ({ value, language: /[\u0600-\u06ff]/.test(value) ? 'ar' : 'en' })),
      aliases: [...new Set(candidate.aliases)],
      sourceIds: [sourceId],
      confidence: candidate.confidence,
      firstSeenAt: now,
      lastSeenAt: now,
      eventIds: [eventId],
      relatedEntityIds: [],
      metadata: {},
    };
  }

  return {
    ...existing,
    aliases: [...new Set([...existing.aliases, ...candidate.aliases])],
    names: [...existing.names, ...candidate.aliases
      .filter(alias => !existing.names.some(name => name.value === alias))
      .map(value => ({ value, language: /[\u0600-\u06ff]/.test(value) ? 'ar' : 'en' }))],
    sourceIds: [...new Set([...existing.sourceIds, sourceId])],
    eventIds: [...new Set([...existing.eventIds, eventId])],
    lastSeenAt: now,
  };
}
