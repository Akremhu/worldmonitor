import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { queryMenaEntities } from '@/services/mena-intelligence-query';
import type { MenaEntity, MenaEntityType } from '@/config/mena/entities';

const COUNTRIES = [
  ['ALL', 'All countries'],
  ['YE', 'Yemen'], ['SA', 'Saudi Arabia'], ['AE', 'UAE'], ['OM', 'Oman'],
  ['QA', 'Qatar'], ['BH', 'Bahrain'], ['KW', 'Kuwait'], ['IQ', 'Iraq'],
  ['IR', 'Iran'], ['IL', 'Israel'], ['PS', 'Palestine'], ['JO', 'Jordan'],
  ['LB', 'Lebanon'], ['SY', 'Syria'], ['TR', 'Türkiye'], ['EG', 'Egypt'],
] as const;

const TYPES: Array<[MenaEntityType | 'all', string]> = [
  ['all', 'All entity types'],
  ['person', 'Person'],
  ['organization', 'Organization'],
  ['political_entity', 'Political entity'],
  ['military_entity', 'Military entity'],
  ['armed_group', 'Armed group'],
  ['government', 'Government'],
  ['company', 'Company'],
  ['media', 'Media'],
  ['infrastructure', 'Infrastructure'],
  ['location', 'Location'],
  ['vessel', 'Vessel'],
  ['aircraft', 'Aircraft'],
  ['airport', 'Airport'],
  ['port', 'Port'],
  ['energy_asset', 'Energy asset'],
  ['financial_entity', 'Financial entity'],
  ['other', 'Other'],
];

function ageLabel(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function makeSelect(label: string, options: readonly (readonly [string, string])[]): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'mena-entity-select';
  select.setAttribute('aria-label', label);
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  return select;
}

export class MenaEntityMonitorPanel extends Panel {
  private body: HTMLElement;
  private search: HTMLInputElement;
  private country: HTMLSelectElement;
  private type: HTMLSelectElement;
  private unsubscribe: (() => void) | null = null;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'mena-entity-monitor',
      title: 'MENA Entity Monitor',
      infoTooltip:
        'Canonical entities extracted from regional observations. Event counts and last-seen times are calculated from the current intelligence store; names and aliases remain linked to source evidence.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    this.search = document.createElement('input');
    this.search.className = 'mena-entity-search';
    this.search.type = 'search';
    this.search.placeholder = 'Search entities or aliases…';
    this.search.setAttribute('aria-label', 'Search entities');
    this.search.addEventListener('input', () => this.render());

    this.country = makeSelect('Country', COUNTRIES);
    this.type = makeSelect('Entity type', TYPES);
    this.country.addEventListener('change', () => this.render());
    this.type.addEventListener('change', () => this.render());

    const controls = document.createElement('div');
    controls.className = 'mena-entity-controls';
    controls.append(this.search, this.country, this.type);

    this.body = document.createElement('div');
    this.body.className = 'mena-entity-body';
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
    const country = this.country.value === 'ALL' ? undefined : this.country.value;
    const type = this.type.value === 'all' ? undefined : this.type.value as MenaEntityType;
    const entities = queryMenaEntities(getMenaIntelligenceStore().entities, {
      countryCode: country,
      type,
      search: this.search.value,
      limit: 100,
    });

    const store = getMenaIntelligenceStore();
    const ranked = entities
      .map(entity => {
        const events = store.events.filter(event =>
          event.entityIds.includes(entity.id) || event.actorIds.includes(entity.id),
        );
        const lastSeen = Math.max(entity.lastSeenAt || 0, ...events.map(event => event.lastUpdatedAt || event.timestamp));
        return { entity, events, lastSeen };
      })
      .sort((a, b) => b.events.length - a.events.length || b.lastSeen - a.lastSeen);

    this.setCount(ranked.length);
    while (this.body.firstChild) this.body.removeChild(this.body.firstChild);

    if (!ranked.length) {
      const empty = document.createElement('div');
      empty.className = 'mena-entity-empty';
      empty.textContent = store.updatedAt ? 'No matching entities.' : 'Waiting for entity extraction…';
      this.body.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'mena-entity-list';

    for (const { entity, events, lastSeen } of ranked) {
      const row = document.createElement('article');
      row.className = 'mena-entity-row';

      const name = document.createElement('div');
      name.className = 'mena-entity-name';
      name.textContent = entity.canonicalName;

      const typeEl = document.createElement('span');
      typeEl.className = 'mena-entity-type';
      typeEl.textContent = entity.type.replace(/_/g, ' ');

      const count = document.createElement('span');
      count.className = 'mena-entity-event-count';
      count.textContent = `${events.length} events`;

      const seen = document.createElement('span');
      seen.className = 'mena-entity-seen';
      seen.textContent = lastSeen ? `seen ${ageLabel(lastSeen)} ago` : 'not seen';

      const meta = document.createElement('div');
      meta.className = 'mena-entity-meta';
      meta.append(typeEl, count, seen);

      if (entity.aliases.length) {
        const aliases = document.createElement('div');
        aliases.className = 'mena-entity-aliases';
        aliases.textContent = entity.aliases.slice(0, 4).join(' · ');
        row.append(name, meta, aliases);
      } else {
        row.append(name, meta);
      }

      list.appendChild(row);
    }

    this.body.appendChild(list);
  }
}
