import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { queryMenaEvents } from '@/services/mena-intelligence-query';
import type { MenaEvent, MenaEventType, MenaConfidence } from '@/config/mena/events';
import { getMenaSourcePolicy } from '@/config/mena/source-registry';
import { selectMenaEvent } from '@/services/mena-event-selection';

const COUNTRIES = [
  ['ALL', 'All MENA'],
  ['YE', 'Yemen'],
  ['SA', 'Saudi Arabia'],
  ['AE', 'United Arab Emirates'],
  ['OM', 'Oman'],
  ['QA', 'Qatar'],
  ['BH', 'Bahrain'],
  ['KW', 'Kuwait'],
  ['IQ', 'Iraq'],
  ['IR', 'Iran'],
  ['IL', 'Israel'],
  ['PS', 'Palestine'],
  ['JO', 'Jordan'],
  ['LB', 'Lebanon'],
  ['SY', 'Syria'],
  ['TR', 'Türkiye'],
  ['EG', 'Egypt'],
] as const;

const EVENT_TYPES: Array<[MenaEventType | 'all', string]> = [
  ['all', 'All event types'],
  ['conflict', 'Conflict'],
  ['strike', 'Strike'],
  ['explosion', 'Explosion'],
  ['protest', 'Protest'],
  ['arrest', 'Arrest'],
  ['diplomatic', 'Diplomatic'],
  ['military_movement', 'Military movement'],
  ['airspace', 'Airspace'],
  ['maritime', 'Maritime'],
  ['cyber', 'Cyber'],
  ['infrastructure', 'Infrastructure'],
  ['energy', 'Energy'],
  ['economic', 'Economic'],
  ['humanitarian', 'Humanitarian'],
  ['natural_disaster', 'Natural disaster'],
  ['other', 'Other'],
];

const CONFIDENCES: Array<[MenaConfidence | 'all', string]> = [
  ['all', 'All confidence'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
  ['unverified', 'Unverified'],
];

const EMPTY = '—';

function formatAge(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function eventLabel(eventType: MenaEventType): string {
  return eventType.replace(/_/g, ' ');
}

function confidenceClass(confidence: MenaConfidence): string {
  return `mena-confidence mena-confidence-${confidence}`;
}

function freshnessForEvent(event: MenaEvent): { label: string; className: string } {
  const source = event.sources
    .map(s => getMenaSourcePolicy(s.sourceId))
    .find(Boolean);
  const ageMinutes = Math.max(0, (Date.now() - event.timestamp) / 60_000);
  if (!source) {
    return ageMinutes <= 30
      ? { label: 'FRESH', className: 'mena-freshness-fresh' }
      : { label: 'AGING', className: 'mena-freshness-aging' };
  }
  if (ageMinutes <= source.freshMinutes) return { label: 'LIVE', className: 'mena-freshness-live' };
  if (ageMinutes <= source.agingMinutes) return { label: 'FRESH', className: 'mena-freshness-fresh' };
  if (ageMinutes <= source.staleMinutes) return { label: 'AGING', className: 'mena-freshness-aging' };
  return { label: 'STALE', className: 'mena-freshness-stale' };
}

function makeSelect(
  ariaLabel: string,
  options: readonly (readonly [string, string])[],
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'mena-intel-select';
  select.setAttribute('aria-label', ariaLabel);
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  return select;
}

export class MenaEventTimelinePanel extends Panel {
  private body: HTMLElement;
  private countrySelect: HTMLSelectElement;
  private typeSelect: HTMLSelectElement;
  private confidenceSelect: HTMLSelectElement;
  private rangeSelect: HTMLSelectElement;
  private unsubscribe: (() => void) | null = null;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'mena-event-intelligence',
      title: 'MENA Event Intelligence',
      infoTooltip:
        'Normalized regional events from the MENA ingestion pipeline. Every event retains source provenance, timestamp, confidence and linked entities. Freshness is derived from the registered source policy.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    this.countrySelect = makeSelect('Country', COUNTRIES);
    this.typeSelect = makeSelect('Event type', EVENT_TYPES);
    this.confidenceSelect = makeSelect('Confidence', CONFIDENCES);
    this.rangeSelect = makeSelect('Time range', [
      ['6', 'Last 6 hours'],
      ['24', 'Last 24 hours'],
      ['72', 'Last 3 days'],
      ['168', 'Last 7 days'],
    ]);

    for (const select of [this.countrySelect, this.typeSelect, this.confidenceSelect, this.rangeSelect]) {
      select.addEventListener('change', () => this.render());
    }

    const controls = document.createElement('div');
    controls.className = 'mena-intel-controls';
    controls.append(this.countrySelect, this.typeSelect, this.confidenceSelect, this.rangeSelect);

    this.body = document.createElement('div');
    this.body.className = 'mena-intel-body';

    this.content.append(controls, this.body);
    this.render();

    this.unsubscribe = subscribeMenaIntelligenceStore(() => {
      if (this.renderTimer) clearTimeout(this.renderTimer);
      this.renderTimer = setTimeout(() => this.render(), 120);
    });
  }

  override destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderTimer = null;
    super.destroy();
  }

  private render(): void {
    const hours = Number(this.rangeSelect.value || 24);
    const now = Date.now();
    const countryCode = this.countrySelect.value === 'ALL' ? undefined : this.countrySelect.value;
    const eventType = this.typeSelect.value === 'all' ? undefined : this.typeSelect.value as MenaEventType;
    const confidence = this.confidenceSelect.value === 'all' ? undefined : this.confidenceSelect.value as MenaConfidence;

    const events = queryMenaEvents(getMenaIntelligenceStore().events, {
      countryCode,
      eventType,
      confidence,
      since: now - hours * 60 * 60 * 1000,
      limit: 100,
    });

    this.setCount(events.length);
    while (this.body.firstChild) this.body.removeChild(this.body.firstChild);

    const summary = document.createElement('div');
    summary.className = 'mena-intel-summary';

    const total = document.createElement('span');
    total.textContent = `${events.length} events`;

    const entities = new Set(events.flatMap(event => [...event.entityIds, ...event.actorIds]));
    const entityCount = document.createElement('span');
    entityCount.textContent = `${entities.size} linked entities`;

    const sources = new Set(events.flatMap(event => event.sourceIds));
    const sourceCount = document.createElement('span');
    sourceCount.textContent = `${sources.size} sources`;

    summary.append(total, entityCount, sourceCount);
    this.body.appendChild(summary);

    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mena-intel-empty';
      empty.textContent = getMenaIntelligenceStore().updatedAt
        ? 'No matching MENA events in the selected window.'
        : 'Waiting for the first MENA intelligence ingestion pass…';
      this.body.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'mena-intel-list';
    for (const event of events) list.appendChild(this.createEventRow(event));
    this.body.appendChild(list);
  }

  private createEventRow(event: MenaEvent): HTMLElement {
    const row = document.createElement('article');
    row.className = 'mena-intel-event';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Inspect event: ${event.title}`);
    const openDetail = () => selectMenaEvent(event.id);
    row.addEventListener('click', openDetail);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail();
      }
    });

    const top = document.createElement('div');
    top.className = 'mena-intel-event-top';

    const type = document.createElement('span');
    type.className = 'mena-intel-type';
    type.textContent = eventLabel(event.eventType);

    const freshness = freshnessForEvent(event);
    const fresh = document.createElement('span');
    fresh.className = `mena-intel-freshness ${freshness.className}`;
    fresh.textContent = freshness.label;

    const time = document.createElement('time');
    time.className = 'mena-intel-time';
    time.dateTime = new Date(event.timestamp).toISOString();
    time.textContent = formatAge(event.timestamp);

    top.append(type, fresh, time);

    const title = document.createElement('div');
    title.className = 'mena-intel-event-title';
    title.textContent = event.title;

    const meta = document.createElement('div');
    meta.className = 'mena-intel-event-meta';

    const location = document.createElement('span');
    location.textContent = event.location?.city
      ? `${event.location.city}, ${event.location.countryName ?? event.location.countryCode ?? ''}`
      : event.location?.countryName ?? event.location?.countryCode ?? EMPTY;

    const confidence = document.createElement('span');
    confidence.className = confidenceClass(event.confidence);
    confidence.textContent = event.confidence;

    const sourceCount = document.createElement('span');
    sourceCount.textContent = `${event.sources.length} source${event.sources.length === 1 ? '' : 's'}`;

    meta.append(location, confidence, sourceCount);

    if (event.entityIds.length || event.actorIds.length) {
      const linked = document.createElement('div');
      linked.className = 'mena-intel-linked';
      const ids = [...new Set([...event.actorIds, ...event.entityIds])].slice(0, 5);
      const store = getMenaIntelligenceStore();
      for (const id of ids) {
        const entity = store.entities.find(item => item.id === id);
        if (!entity) continue;
        const chip = document.createElement('span');
        chip.className = 'mena-intel-entity-chip';
        chip.textContent = entity.canonicalName;
        linked.appendChild(chip);
      }
      if (linked.childElementCount) row.appendChild(linked);
    }

    const sources = document.createElement('div');
    sources.className = 'mena-intel-sources';
    for (const source of event.sources.slice(0, 3)) {
      const sourceEl = document.createElement('span');
      sourceEl.textContent = source.sourceName;
      sources.appendChild(sourceEl);
    }

    row.append(top, title, meta, sources);
    return row;
  }
}
