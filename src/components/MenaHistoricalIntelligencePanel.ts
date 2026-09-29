import { Panel } from './Panel';
import { queryDurableMenaEventHistory } from '@/services/mena-event-history';
import { selectMenaEvent } from '@/services/mena-event-selection';
import type { MenaEvent, MenaEventType } from '@/config/mena/events';

const COUNTRIES = [
  ['ALL', 'All MENA'], ['YE', 'Yemen'], ['SA', 'Saudi Arabia'], ['AE', 'UAE'],
  ['OM', 'Oman'], ['QA', 'Qatar'], ['BH', 'Bahrain'], ['KW', 'Kuwait'],
  ['IQ', 'Iraq'], ['IR', 'Iran'], ['IL', 'Israel'], ['PS', 'Palestine'],
  ['JO', 'Jordan'], ['LB', 'Lebanon'], ['SY', 'Syria'], ['TR', 'Türkiye'], ['EG', 'Egypt'],
] as const;

const TYPES: Array<[MenaEventType | 'all', string]> = [
  ['all', 'All types'], ['conflict', 'Conflict'], ['strike', 'Strike'],
  ['explosion', 'Explosion'], ['protest', 'Protest'], ['arrest', 'Arrest'],
  ['diplomatic', 'Diplomatic'], ['military_movement', 'Military movement'],
  ['airspace', 'Airspace'], ['maritime', 'Maritime'], ['cyber', 'Cyber'],
  ['infrastructure', 'Infrastructure'], ['energy', 'Energy'], ['economic', 'Economic'],
  ['humanitarian', 'Humanitarian'], ['natural_disaster', 'Natural disaster'], ['other', 'Other'],
];

function select(label: string, options: readonly (readonly [string, string])[]): HTMLSelectElement {
  const el = document.createElement('select');
  el.className = 'mena-intel-select';
  el.setAttribute('aria-label', label);
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    el.appendChild(option);
  }
  return el;
}

function rangeLabel(hours: number): string {
  if (hours >= 24 * 30) return '30d';
  if (hours >= 24 * 7) return '7d';
  return hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export class MenaHistoricalIntelligencePanel extends Panel {
  private body: HTMLElement;
  private country: HTMLSelectElement;
  private type: HTMLSelectElement;
  private range: HTMLSelectElement;
  private loadButton: HTMLButtonElement;
  private status: HTMLElement;
  private events: MenaEvent[] = [];

  constructor() {
    super({
      id: 'mena-historical-intelligence',
      title: 'Historical MENA Intelligence',
      infoTooltip: 'Durable historical events retrieved from the server-side intelligence archive. Historical records preserve provenance; they do not establish attribution or intent.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    this.country = select('Historical country', COUNTRIES);
    this.type = select('Historical event type', TYPES);
    this.range = select('Historical time range', [
      ['24', '24 hours'], ['168', '7 days'], ['720', '30 days'], ['2160', '90 days'], ['4320', '180 days'],
    ]);
    this.loadButton = document.createElement('button');
    this.loadButton.className = 'mena-history-load';
    this.loadButton.textContent = 'Load history';
    this.status = document.createElement('span');
    this.status.className = 'mena-history-status';

    const controls = document.createElement('div');
    controls.className = 'mena-intel-controls';
    controls.append(this.country, this.type, this.range, this.loadButton, this.status);

    this.body = document.createElement('div');
    this.body.className = 'mena-history-body';
    this.content.append(controls, this.body);

    this.loadButton.addEventListener('click', () => void this.load());
    this.body.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const row = target.closest<HTMLElement>('[data-mena-event-id]');
      const id = row?.dataset.menaEventId;
      if (id) selectMenaEvent(id);
    });

    void this.load();
  }

  private async load(): Promise<void> {
    this.loadButton.disabled = true;
    this.status.textContent = 'Loading…';
    const hours = Number(this.range.value);
    const now = Date.now();

    try {
      const events = await queryDurableMenaEventHistory({
        countryCode: this.country.value === 'ALL' ? undefined : this.country.value,
        since: now - hours * 60 * 60 * 1000,
        until: now,
        limit: 100,
      });

      const selectedType = this.type.value === 'all' ? undefined : this.type.value;
      this.events = selectedType
        ? events.filter(event => event.eventType === selectedType)
        : events;

      this.setCount(this.events.length);
      this.render();
      this.status.textContent = `${this.events.length} records · ${rangeLabel(hours)}`;
    } catch (error) {
      this.events = [];
      this.setCount(0);
      this.body.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'mena-history-empty';
      empty.textContent = error instanceof Error ? error.message : 'Historical query failed';
      this.body.appendChild(empty);
      this.status.textContent = 'Unavailable';
    } finally {
      this.loadButton.disabled = false;
    }
  }

  private render(): void {
    this.body.replaceChildren();
    if (!this.events.length) {
      const empty = document.createElement('div');
      empty.className = 'mena-history-empty';
      empty.textContent = 'No durable historical events match the selected scope.';
      this.body.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'mena-history-list';

    for (const event of this.events) {
      const row = document.createElement('article');
      row.className = 'mena-history-row';
      row.dataset.menaEventId = event.id;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');

      const time = document.createElement('time');
      time.className = 'mena-history-time';
      time.dateTime = new Date(event.timestamp).toISOString();
      time.textContent = formatTime(event.timestamp);

      const title = document.createElement('strong');
      title.className = 'mena-history-title';
      title.textContent = event.title;

      const meta = document.createElement('span');
      meta.className = 'mena-history-meta';
      meta.textContent = [
        event.eventType.replace(/_/g, ' '),
        event.location?.countryName || event.location?.countryCode,
        event.sources.length ? `${event.sources.length} sources` : '',
        event.confidence,
      ].filter(Boolean).join(' · ');

      row.append(time, title, meta);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectMenaEvent(event.id);
        }
      });
      list.appendChild(row);
    }

    this.body.appendChild(list);
  }
}
