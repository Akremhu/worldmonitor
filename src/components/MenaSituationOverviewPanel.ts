import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { MENA_SOURCE_HEALTH_POLICIES, getMenaFreshnessState } from '@/config/mena/source-health';
import { setTrustedHtml, trustedHtml } from '@/utils/dom-utils';

const COUNTRIES = [
  ['YE', 'Yemen'], ['SA', 'Saudi Arabia'], ['AE', 'UAE'], ['OM', 'Oman'],
  ['QA', 'Qatar'], ['BH', 'Bahrain'], ['KW', 'Kuwait'], ['IQ', 'Iraq'],
  ['IR', 'Iran'], ['IL', 'Israel'], ['PS', 'Palestine'], ['JO', 'Jordan'],
  ['LB', 'Lebanon'], ['SY', 'Syria'], ['TR', 'Türkiye'], ['EG', 'Egypt'],
] as const;

const EVENT_TYPES = [
  'conflict', 'strike', 'explosion', 'protest', 'arrest', 'diplomatic',
  'military_movement', 'airspace', 'maritime', 'cyber', 'infrastructure',
  'energy', 'economic', 'humanitarian', 'natural_disaster', 'other',
] as const;

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function age(timestamp: number): string {
  if (!timestamp) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function countByCountry(events: ReturnType<typeof getMenaIntelligenceStore>['events'], code: string): number {
  return events.filter((event) => event.location?.countryCode === code || event.tags?.includes(code)).length;
}

export class MenaSituationOverviewPanel extends Panel {
  private body: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'mena-situation-overview',
      title: 'MENA Situation Overview',
      infoTooltip: 'Current regional event activity, event-type distribution and evidence freshness from the intelligence store. This is descriptive OSINT aggregation, not a risk or political judgment.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    this.body = document.createElement('div');
    this.body.className = 'mena-situation-body';
    this.content.appendChild(this.body);
    this.render();

    this.unsubscribe = subscribeMenaIntelligenceStore(() => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.render(), 150);
    });
  }

  override destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    super.destroy();
  }

  private render(): void {
    const store = getMenaIntelligenceStore();
    const events = store.events;
    const now = Date.now();
    const last24h = events.filter((e) => now - e.timestamp <= 86_400_000);
    const countries = COUNTRIES.map(([code, name]) => ({
      code,
      name,
      count: countByCountry(last24h, code),
    })).sort((a, b) => b.count - a.count);

    const typeCounts = EVENT_TYPES
      .map((type) => [type, last24h.filter((e) => e.eventType === type).length] as const)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const sourceRows = MENA_SOURCE_HEALTH_POLICIES.map((policy) => {
      const sourceEvents = events.filter((e) => e.sourceIds.includes(policy.id));
      const lastSeen = sourceEvents.reduce((max, event) => Math.max(max, event.lastUpdatedAt || event.timestamp), 0);
      const ageMinutes = lastSeen ? Math.max(0, (Date.now() - lastSeen) / 60_000) : null;
      const state = getMenaFreshnessState(ageMinutes, policy);
      return { policy, state, lastSeen, events: sourceEvents.length };
    }).sort((a, b) => {
      const rank = { LIVE: 0, FRESH: 1, AGING: 2, STALE: 3, DEAD: 4 } as const;
      return rank[a.state] - rank[b.state] || b.lastSeen - a.lastSeen;
    });

    this.setCount(events.length);
    this.body.replaceChildren();

    const stats = document.createElement('div');
    stats.className = 'mena-situation-stats';
    for (const [label, value] of [
      ['Events 24h', String(last24h.length)],
      ['Entities', String(store.entities.length)],
      ['Sources', String(MENA_SOURCE_HEALTH_POLICIES.length)],
      ['Updated', store.updatedAt ? age(store.updatedAt) + ' ago' : '—'],
    ]) {
      const card = document.createElement('div');
      card.className = 'mena-situation-stat';
      setTrustedHtml(card, trustedHtml(`<span>${esc(String(label))}</span><strong>${esc(String(value))}</strong>`, 'Escaped descriptive situation statistics.'));
      stats.appendChild(card);
    }

    const grid = document.createElement('div');
    grid.className = 'mena-situation-grid';

    const countrySection = document.createElement('section');
    countrySection.className = 'mena-situation-section';
    const countryHeading = document.createElement('h4');
    countryHeading.textContent = 'Activity by country · 24h';
    countrySection.appendChild(countryHeading);
    for (const row of countries.slice(0, 8)) {
      const item = document.createElement('div');
      item.className = 'mena-situation-bar-row';
      const barWidth = last24h.length ? Math.min(100, row.count / Math.max(1, countries[0]?.count ?? 0) * 100) : 0;
      setTrustedHtml(item, trustedHtml(`<span>${row.name}</span><i><b></b></i><em>${row.count}</em>`, 'Country names are configured data; numeric values are computed.'));
      const bar = item.querySelector('b');
      if (bar) bar.style.width = `${barWidth}%`;
      countrySection.appendChild(item);
    }

    const typeSection = document.createElement('section');
    typeSection.className = 'mena-situation-section';
    const typeHeading = document.createElement('h4');
    typeHeading.textContent = 'Event types · 24h';
    typeSection.appendChild(typeHeading);
    for (const [type, count] of typeCounts) {
      const item = document.createElement('div');
      item.className = 'mena-situation-type';
      setTrustedHtml(item, trustedHtml(`<span>${type.replace(/_/g, ' ')}</span><strong>${count}</strong>`, 'Event type is an application enum; count is computed.'));
      typeSection.appendChild(item);
    }
    if (!typeCounts.length) {
      const empty = document.createElement('div');
      empty.className = 'mena-situation-empty';
      empty.textContent = 'Waiting for regional events…';
      typeSection.appendChild(empty);
    }

    grid.append(countrySection, typeSection);

    const sourceSection = document.createElement('section');
    sourceSection.className = 'mena-situation-sources';
    const sourceHeading = document.createElement('h4');
    sourceHeading.textContent = 'Evidence freshness';
    sourceSection.appendChild(sourceHeading);
    for (const row of sourceRows.slice(0, 10)) {
      const item = document.createElement('div');
      item.className = 'mena-situation-source';
      setTrustedHtml(item, trustedHtml(`<span>${row.policy.name}</span><b class="mena-source-${row.state.toLowerCase()}">${row.state}</b><em>${row.lastSeen ? age(row.lastSeen) + ' ago' : 'no events'}</em>`, 'Source policy names and freshness states are controlled application data.'));
      sourceSection.appendChild(item);
    }

    this.body.append(stats, grid, sourceSection);
  }
}
