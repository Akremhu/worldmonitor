import type { NewsItem } from '@/types';
import { getMenaSourcePolicy } from '@/config/mena/source-registry';
import { createMenaEventId } from '@/config/mena/event-graph';
import { normalizeMenaEvent } from '@/config/mena/normalization';
import type { MenaEvent } from '@/config/mena/events';

const COUNTRY_MATCHES: readonly [string, string, readonly string[]][] = [
  ['YE', 'Yemen', ['yemen', 'اليمن', 'صنعاء', 'عدن', 'الحديدة', 'مأرب']],
  ['SA', 'Saudi Arabia', ['saudi arabia', 'saudi', 'السعودية', 'الرياض', 'جدة']],
  ['AE', 'United Arab Emirates', ['uae', 'emirates', 'dubai', 'abu dhabi', 'الإمارات', 'دبي', 'أبوظبي']],
  ['OM', 'Oman', ['oman', 'مسقط', 'عمان']],
  ['QA', 'Qatar', ['qatar', 'doha', 'قطر', 'الدوحة']],
  ['BH', 'Bahrain', ['bahrain', 'manama', 'البحرين', 'المنامة']],
  ['KW', 'Kuwait', ['kuwait', 'الكويت']],
  ['IQ', 'Iraq', ['iraq', 'baghdad', 'mosul', 'العراق', 'بغداد', 'الموصل']],
  ['IR', 'Iran', ['iran', 'tehran', 'iranian', 'إيران', 'طهران']],
  ['IL', 'Israel', ['israel', 'israeli', 'تل أبيب', 'إسرائيل']],
  ['PS', 'Palestine', ['palestine', 'gaza', 'west bank', 'غزة', 'فلسطين', 'الضفة الغربية']],
  ['JO', 'Jordan', ['jordan', 'amman', 'الأردن', 'عمّان']],
  ['LB', 'Lebanon', ['lebanon', 'beirut', 'لبنان', 'بيروت']],
  ['SY', 'Syria', ['syria', 'damascus', 'aleppo', 'سوريا', 'دمشق', 'حلب']],
  ['TR', 'Turkey', ['turkey', 'turkish', 'ankara', 'istanbul', 'تركيا', 'أنقرة', 'إسطنبول']],
  ['EG', 'Egypt', ['egypt', 'cairo', 'sinai', 'مصر', 'القاهرة', 'سيناء']],
];

function detectCountry(text: string): { countryCode: string; countryName: string } | undefined {
  const value = text.toLowerCase();
  for (const [countryCode, countryName, aliases] of COUNTRY_MATCHES) {
    if (aliases.some(alias => value.includes(alias.toLowerCase()))) return { countryCode, countryName };
  }
  return undefined;
}

function stableSourceId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Converts already-fetched World Monitor NewsItems into the canonical MENA
 * event layer. It does not fetch anything itself, so the existing digest/RSS
 * freshness and source controls remain authoritative.
 */
export function ingestMenaNewsItems(items: readonly NewsItem[]): MenaEvent[] {
  const events: MenaEvent[] = [];

  for (const item of items) {
    const policy = getMenaSourcePolicy(item.source);
    const location = detectCountry([item.title, item.snippet ?? ''].join(' '));

    // A registered MENA source is region-relevant by provenance. Other feeds
    // must explicitly mention a MENA country/location before entering this layer.
    if (!policy && !location) continue;

    const sourceId = policy?.id ?? stableSourceId(item.source);
    const timestamp = Number.isFinite(new Date(item.pubDate).getTime())
      ? new Date(item.pubDate).getTime()
      : Date.now();

    const event = normalizeMenaEvent({
      id: createMenaEventId(timestamp, sourceId, item.title),
      title: item.title,
      summary: item.snippet,
      timestamp,
      sourceId,
      sourceName: item.source,
      sourceTier: policy?.tier,
      location: location
        ? { ...location, precision: 'country' }
        : undefined,
    });

    if (event.title && event.sourceIds.length) events.push(event);
  }

  return events;
}

let currentMenaEvents: MenaEvent[] = [];

export function setMenaEvents(events: readonly MenaEvent[]): void {
  currentMenaEvents = [...events];
}

export function getMenaEvents(): readonly MenaEvent[] {
  return currentMenaEvents;
}

export function getMenaEventStats(events: readonly MenaEvent[] = currentMenaEvents) {
  const byType = new Map<string, number>();
  const byCountry = new Map<string, number>();

  for (const event of events) {
    byType.set(event.eventType, (byType.get(event.eventType) ?? 0) + 1);
    const country = event.location?.countryCode;
    if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
  }

  return {
    total: events.length,
    byType: Object.fromEntries(byType),
    byCountry: Object.fromEntries(byCountry),
  };
}
