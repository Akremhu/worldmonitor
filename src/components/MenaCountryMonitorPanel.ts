import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';

const COUNTRIES = [
  ['YE', 'Yemen'], ['SA', 'Saudi Arabia'], ['AE', 'United Arab Emirates'], ['OM', 'Oman'],
  ['QA', 'Qatar'], ['BH', 'Bahrain'], ['KW', 'Kuwait'], ['IQ', 'Iraq'],
  ['IR', 'Iran'], ['IL', 'Israel'], ['PS', 'Palestine'], ['JO', 'Jordan'],
  ['LB', 'Lebanon'], ['SY', 'Syria'], ['TR', 'Türkiye'], ['EG', 'Egypt'],
] as const;

function age(timestamp: number): string {
  if (!timestamp) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function eventCount(events: ReturnType<typeof getMenaIntelligenceStore>['events'], code: string, since: number): number {
  return events.filter((event) => event.timestamp >= since && event.location?.countryCode === code).length;
}

export class MenaCountryMonitorPanel extends Panel {
  private body: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'mena-country-monitor',
      title: 'MENA Country Monitor',
      infoTooltip: 'Country-level activity from normalized MENA events. Counts describe observed reporting in the selected windows and are not a risk score or political assessment.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    this.body = document.createElement('div');
    this.body.className = 'mena-country-body';
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
    const now = Date.now();
    const events = store.events;
    const rows = COUNTRIES.map(([code, name]) => {
      const last24h = eventCount(events, code, now - 86_400_000);
      const last7d = eventCount(events, code, now - 7 * 86_400_000);
      const entities = new Set(
        events
          .filter((event) => event.timestamp >= now - 7 * 86_400_000 && event.location?.countryCode === code)
          .flatMap((event) => [...event.actorIds, ...event.entityIds]),
      );
      const lastSeen = events
        .filter((event) => event.location?.countryCode === code)
        .reduce((max, event) => Math.max(max, event.lastUpdatedAt || event.timestamp), 0);
      const previous24h = eventCount(events, code, now - 2 * 86_400_000) - last24h;
      return { code, name, last24h, previous24h: Math.max(0, previous24h), last7d, entities: entities.size, lastSeen };
    });

    this.setCount(COUNTRIES.length);
    this.body.replaceChildren();

    const header = document.createElement('div');
    header.className = 'mena-country-header';
    header.innerHTML = '<span>Country</span><span>24h</span><span>7d</span><span>Linked</span><span>Last seen</span>';
    this.body.appendChild(header);

    const list = document.createElement('div');
    list.className = 'mena-country-list';

    for (const rowData of rows) {
      const row = document.createElement('div');
      row.className = 'mena-country-row';

      const country = document.createElement('strong');
      country.textContent = rowData.name;

      const current = document.createElement('span');
      current.textContent = String(rowData.last24h);

      const week = document.createElement('span');
      week.textContent = String(rowData.last7d);

      const linked = document.createElement('span');
      linked.textContent = String(rowData.entities);

      const seen = document.createElement('span');
      seen.textContent = rowData.lastSeen ? age(rowData.lastSeen) : '—';

      row.append(country, current, week, linked, seen);
      list.appendChild(row);
    }

    if (!events.length) {
      const empty = document.createElement('div');
      empty.className = 'mena-country-empty';
      empty.textContent = 'Waiting for regional event ingestion…';
      this.body.appendChild(empty);
    } else {
      this.body.appendChild(list);
    }

    const footer = document.createElement('div');
    footer.className = 'mena-country-footer';
    footer.textContent = '24h / 7d counts are descriptive observations from the current event store.';
    this.body.appendChild(footer);
  }
}
