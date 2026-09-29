import { Panel } from './Panel';
import { getMenaEntity, getMenaEvent, getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { getMenaSourcePolicy } from '@/config/mena/source-registry';
import type { MenaEvent, MenaEventSource } from '@/config/mena/events';
import { getSelectedMenaEventId, subscribeMenaEventSelection } from '@/services/mena-event-selection';

const EMPTY = '—';

function formatDate(value?: number | null): string {
  if (!value || !Number.isFinite(value)) return EMPTY;
  return new Date(value).toLocaleString();
}

function ageMinutes(value?: number | null): number | null {
  if (!value) return null;
  return Math.max(0, (Date.now() - value) / 60000);
}

function freshness(source: MenaEventSource): string {
  const policy = getMenaSourcePolicy(source.sourceId);
  const age = ageMinutes(source.publishedAt ?? null);
  if (!policy || age == null) return 'UNKNOWN';
  if (age <= policy.freshMinutes) return 'LIVE';
  if (age <= policy.agingMinutes) return 'FRESH';
  if (age <= policy.staleMinutes) return 'AGING';
  return 'STALE';
}

function addField(container: HTMLElement, label: string, value: string): void {
  const item = document.createElement('div');
  item.className = 'mena-detail-field';
  const key = document.createElement('span');
  key.className = 'mena-detail-label';
  key.textContent = label;
  const val = document.createElement('span');
  val.className = 'mena-detail-value';
  val.textContent = value;
  item.append(key, val);
  container.appendChild(item);
}

export class MenaEventDetailPanel extends Panel {
  private body: HTMLElement;
  private unsubscribeSelection: (() => void) | null = null;
  private unsubscribeStore: (() => void) | null = null;

  constructor() {
    super({
      id: 'mena-event-detail',
      title: 'MENA Intelligence Evidence',
      infoTooltip: 'Evidence-first event detail: provenance, timestamps, confidence, linked entities and related observations. Entity mention alone does not establish responsibility.',
      showCount: false,
      className: 'panel-wide',
      collapsible: true,
    });

    this.body = document.createElement('div');
    this.body.className = 'mena-detail-body';
    this.content.appendChild(this.body);
    this.render();

    this.unsubscribeSelection = subscribeMenaEventSelection(() => this.render());
    this.unsubscribeStore = subscribeMenaIntelligenceStore(() => this.render());
  }

  override destroy(): void {
    this.unsubscribeSelection?.();
    this.unsubscribeStore?.();
    this.unsubscribeSelection = null;
    this.unsubscribeStore = null;
    super.destroy();
  }

  private render(): void {
    this.body.replaceChildren();
    const eventId = getSelectedMenaEventId();
    if (!eventId) {
      const empty = document.createElement('div');
      empty.className = 'mena-detail-empty';
      empty.textContent = 'Select an event from the MENA Event Intelligence timeline to inspect its evidence.';
      this.body.appendChild(empty);
      return;
    }

    const event = getMenaEvent(eventId);
    if (!event) {
      const empty = document.createElement('div');
      empty.className = 'mena-detail-empty';
      empty.textContent = 'Selected event is no longer present in the current intelligence store.';
      this.body.appendChild(empty);
      return;
    }

    this.renderEvent(event);
  }

  private renderEvent(event: MenaEvent): void {
    const title = document.createElement('div');
    title.className = 'mena-detail-title';
    title.textContent = event.title;

    const summary = document.createElement('div');
    summary.className = 'mena-detail-summary';
    summary.textContent = event.summary || EMPTY;

    const grid = document.createElement('div');
    grid.className = 'mena-detail-grid';
    addField(grid, 'Event type', event.eventType.replace(/_/g, ' '));
    addField(grid, 'Confidence', event.confidence);
    addField(grid, 'Status', event.status);
    addField(grid, 'Observed', formatDate(event.timestamp));
    addField(grid, 'First seen', formatDate(event.firstSeenAt));
    addField(grid, 'Last updated', formatDate(event.lastUpdatedAt));
    addField(
      grid,
      'Location',
      event.location
        ? [event.location.city, event.location.region, event.location.countryName ?? event.location.countryCode].filter(Boolean).join(', ') || EMPTY
        : EMPTY,
    );
    addField(
      grid,
      'Coordinates',
      event.location?.latitude != null && event.location?.longitude != null
        ? `${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`
        : EMPTY,
    );

    const sources = document.createElement('section');
    sources.className = 'mena-detail-section';
    const sourceTitle = document.createElement('h4');
    sourceTitle.textContent = `Sources (${event.sources.length})`;
    sources.appendChild(sourceTitle);

    for (const source of event.sources) {
      const row = document.createElement('article');
      row.className = 'mena-detail-source';
      const name = document.createElement('strong');
      name.textContent = source.sourceName;
      const meta = document.createElement('div');
      meta.textContent = [
        `Tier ${source.sourceTier ?? '—'}`,
        `Published: ${formatDate(source.publishedAt)}`,
        `Fetched: ${formatDate(source.fetchedAt)}`,
        `Freshness: ${freshness(source)}`,
      ].join(' · ');
      row.append(name, meta);
      if (source.url) {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open source';
        row.appendChild(link);
      }
      sources.appendChild(row);
    }

    const entities = document.createElement('section');
    entities.className = 'mena-detail-section';
    const entityIds = [...new Set([...event.actorIds, ...event.entityIds])];
    const entityTitle = document.createElement('h4');
    entityTitle.textContent = `Linked entities (${entityIds.length})`;
    entities.appendChild(entityTitle);

    for (const id of entityIds) {
      const entity = getMenaEntity(id);
      if (!entity) continue;
      const row = document.createElement('div');
      row.className = 'mena-detail-entity';
      row.textContent = `${entity.canonicalName} · ${entity.type}${entity.aliases.length ? ` · ${entity.aliases.slice(0, 3).join(', ')}` : ''}`;
      entities.appendChild(row);
    }

    const relations = document.createElement('section');
    relations.className = 'mena-detail-section';
    const relationTitle = document.createElement('h4');
    relationTitle.textContent = 'Related observations';
    relations.appendChild(relationTitle);
    addField(relations, 'Related events', event.relatedEventIds.length ? event.relatedEventIds.join(', ') : EMPTY);
    addField(relations, 'Related stories', event.relatedStoryIds.length ? event.relatedStoryIds.join(', ') : EMPTY);
    addField(relations, 'Tags', event.tags.length ? event.tags.join(', ') : EMPTY);

    const note = document.createElement('div');
    note.className = 'mena-detail-provenance-note';
    note.textContent = 'OSINT provenance is preserved as reported evidence. Entity mention does not by itself establish responsibility, attribution, or intent.';

    this.body.append(title, summary, grid, sources, entities, relations, note);
  }
}
