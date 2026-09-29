#!/usr/bin/env node

import { loadEnvFile, CHROME_UA, runSeed } from './_seed-utils.mjs';
import { appendSeedHistory } from './_seed-history.mjs';

loadEnvFile(import.meta.url);

export const MENA_NEWS_FEEDS = [
  { id: 'sanaa-center', name: "Sana'a Center", url: 'https://sanaacenter.org/feed' },
  { id: 'un-yemen', name: 'UN Yemen', url: 'https://yemen.un.org/en/rss.xml' },
  { id: 'ocha-yemen', name: 'OCHA Yemen', url: 'https://www.unocha.org/rss.xml' },
  { id: 'arab-news', name: 'Arab News', url: 'https://www.arabnews.com/rss.xml' },
  { id: 'the-national', name: 'The National', url: 'https://www.thenationalnews.com/rss' },
  { id: 'irna', name: 'IRNA', url: 'https://en.irna.ir/rss' },
  { id: 'mehr', name: 'Mehr News', url: 'https://en.mehrnews.com/rss' },
  { id: 'bbc-persian', name: 'BBC Persian', url: 'https://feeds.bbci.co.uk/persian/rss.xml' },
  { id: 'jerusalem-post', name: 'Jerusalem Post', url: 'https://www.jpost.com/rss/rssfeedsheadlines.aspx' },
  { id: 'wafa', name: 'WAFA', url: 'https://english.wafa.ps/rss' },
  { id: 'rudaw', name: 'Rudaw', url: 'https://www.rudaw.net/english/rss' },
];

const COUNTRIES = [
  ['YE', ['yemen', 'اليمن', 'sanaa', 'sana’a', 'aden', 'صنعاء', 'عدن']],
  ['SA', ['saudi arabia', 'saudi', 'السعودية', 'riyadh', 'الرياض']],
  ['AE', ['uae', 'united arab emirates', 'الإمارات', 'dubai', 'دبي', 'abu dhabi', 'أبوظبي']],
  ['OM', ['oman', 'عمان', 'muscat', 'مسقط']],
  ['QA', ['qatar', 'قطر', 'doha', 'الدوحة']],
  ['BH', ['bahrain', 'البحرين', 'manama', 'المنامة']],
  ['KW', ['kuwait', 'الكويت']],
  ['IQ', ['iraq', 'العراق', 'baghdad', 'بغداد']],
  ['IR', ['iran', 'إيران', 'tehran', 'طهران']],
  ['IL', ['israel', 'إسرائيل', 'tel aviv', 'تل أبيب', 'jerusalem', 'القدس']],
  ['PS', ['palestine', 'فلسطين', 'gaza', 'غزة', 'west bank', 'الضفة']],
  ['JO', ['jordan', 'الأردن', 'amman', 'عمّان']],
  ['LB', ['lebanon', 'لبنان', 'beirut', 'بيروت']],
  ['SY', ['syria', 'سوريا', 'damascus', 'دمشق']],
  ['TR', ['turkey', 'türkiye', 'تركيا', 'ankara', 'أنقرة', 'istanbul', 'إسطنبول']],
  ['EG', ['egypt', 'مصر', 'cairo', 'القاهرة']],
];

const EVENT_TYPES = [
  ['conflict', ['war', 'conflict', 'fighting', 'clashes', 'حرب', 'نزاع', 'اشتباكات']],
  ['strike', ['strike', 'airstrike', 'missile', 'rocket', 'raid', 'غارة', 'قصف', 'صاروخ']],
  ['protest', ['protest', 'demonstration', 'احتجاج', 'مظاهرة']],
  ['arrest', ['arrest', 'detained', 'detention', 'اعتقال', 'احتجاز']],
  ['diplomatic', ['talks', 'meeting', 'diplomatic', 'negotiation', 'مفاوضات', 'دبلوماسي']],
  ['military_movement', ['military', 'troops', 'forces', 'deployment', 'قوات', 'عسكري', 'انتشار']],
  ['maritime', ['ship', 'vessel', 'tanker', 'maritime', 'port', 'سفينة', 'ناقلة', 'بحري', 'ميناء']],
  ['energy', ['oil', 'gas', 'energy', 'pipeline', 'نفط', 'غاز', 'طاقة', 'أنبوب']],
  ['economic', ['economy', 'market', 'trade', 'sanctions', 'اقتصاد', 'تجارة', 'عقوبات']],
  ['humanitarian', ['humanitarian', 'aid', 'displacement', 'refugee', 'مساعدات', 'نازح', 'لاجئ']],
];

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function text(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return text(match?.[1] || '');
}

function link(block) {
  const direct = tag(block, 'link');
  if (direct) return direct;
  return text((block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '');
}

function parse(xml, feed) {
  const out = [];
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\\s\\S]*?)<\/(?:item|entry)>/gi)];
  for (const match of blocks) {
    const block = match[1];
    const title = tag(block, 'title');
    const url = link(block);
    const rawDate = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
    const timestamp = new Date(rawDate).getTime();
    if (!title || !url || !Number.isFinite(timestamp)) continue;
    const summary = (tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded')).slice(0, 2000);
    const corpus = `${title} ${summary}`.toLowerCase();
    let countryCode;
    for (const [code, aliases] of COUNTRIES) {
      if (aliases.some(alias => corpus.includes(alias.toLowerCase()))) { countryCode = code; break; }
    }
    if (!countryCode) continue;
    let eventType = 'other';
    for (const [type, aliases] of EVENT_TYPES) {
      if (aliases.some(alias => corpus.includes(alias))) { eventType = type; break; }
    }
    out.push({
      id: `mena-${hash(url)}`,
      title,
      summary,
      timestamp,
      eventType,
      countryCode,
      sourceId: feed.id,
      sourceName: feed.name,
      sourceUrl: url,
    });
  }
  return out;
}

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': CHROME_UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    return parse((await response.text()).slice(0, 750000), feed);
  } catch {
    return [];
  }
}

async function collect() {
  const results = await Promise.allSettled(MENA_NEWS_FEEDS.map(fetchFeed));
  const events = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const seen = new Set();
  const unique = events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 250);

  try {
    await appendSeedHistory({
      domain: 'mena',
      resource: 'events',
      runId: `mena-${Date.now()}`,
      records: unique.map(event => ({
        dedupeKey: `mena:events:${event.id}`,
        title: event.title,
        summary: event.summary,
        occurredAt: event.timestamp,
        country: event.countryCode,
        category: event.eventType,
        sourceUrl: event.sourceUrl,
        metadata: {
          schemaVersion: 1,
          eventId: event.id,
          eventType: event.eventType,
          location: { countryCode: event.countryCode },
          sourceIds: [event.sourceId],
          sources: [{
            sourceId: event.sourceId,
            sourceName: event.sourceName,
            publishedAt: event.timestamp,
            url: event.sourceUrl,
          }],
        },
      })),
    });
  } catch (error) {
    console.warn('[MENA history] append failed:', error?.message || error);
  }

  return { events: unique };
}

const CANONICAL_KEY = 'mena:news-intelligence:v1';

if (process.argv[1]?.endsWith('seed-mena-news.mjs')) {
  runSeed('mena', 'news-intelligence', CANONICAL_KEY, collect, {
    validateFn: data => Array.isArray(data?.events),
    ttlSeconds: 900,
    sourceVersion: 'mena-rss-v1',
    recordCount: data => data?.events?.length || 0,
    declareRecords: data => data?.events?.length || 0,
    schemaVersion: 1,
    maxStaleMin: 90,
  }).catch(error => {
    console.error('FATAL:', error?.message || error);
    process.exit(1);
  });
}
