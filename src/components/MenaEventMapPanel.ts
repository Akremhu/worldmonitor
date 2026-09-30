import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { selectMenaEvent } from '@/services/mena-event-selection';

const COUNTRIES = [
  ['EG', 'Egypt', 30.8, 30.8], ['IL', 'Israel', 31.5, 34.8], ['PS', 'Palestine', 31.9, 35.2],
  ['JO', 'Jordan', 31.2, 36.5], ['LB', 'Lebanon', 33.9, 35.8], ['SY', 'Syria', 35.0, 38.5],
  ['IQ', 'Iraq', 33.2, 43.7], ['TR', 'Türkiye', 39.0, 35.0], ['IR', 'Iran', 32.4, 53.7],
  ['SA', 'Saudi Arabia', 24.0, 45.0], ['YE', 'Yemen', 15.6, 48.5], ['OM', 'Oman', 20.5, 56.0],
  ['AE', 'UAE', 24.2, 54.4], ['QA', 'Qatar', 25.3, 51.2], ['BH', 'Bahrain', 26.0, 50.5],
  ['KW', 'Kuwait', 29.3, 47.5],
] as const;

function project(lat: number, lon: number, width: number, height: number): [number, number] {
  const x = ((lon - 24) / (62 - 24)) * width;
  const y = ((42 - lat) / (42 - 10)) * height;
  return [Math.max(8, Math.min(width - 8, x)), Math.max(8, Math.min(height - 8, y))];
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

export class MenaEventMapPanel extends Panel {
  private body: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'mena-event-map',
      title: 'MENA Event Map',
      infoTooltip: 'Schematic geographic view of normalized events. Country positions are reference centroids when precise event coordinates are unavailable; this is not a boundary or precision map.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });
    this.body = document.createElement('div');
    this.body.className = 'mena-map-body';
    this.content.appendChild(this.body);
    this.render();
    this.unsubscribe = subscribeMenaIntelligenceStore(() => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.render(), 180);
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
    const events = store.events.filter((event) => Date.now() - event.timestamp <= 7 * 86_400_000);
    const width = 760;
    const height = 420;

    const points: string[] = [];
    const mappedEvents = events.filter((event) => event.location?.countryCode || event.location?.latitude != null);
    const counts = new Map<string, number>();
    for (const event of mappedEvents) {
      const code = event.location?.countryCode;
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
      const country = COUNTRIES.find((row) => row[0] === code);
      const lat = event.location?.latitude ?? country?.[2];
      const lon = event.location?.longitude ?? country?.[3];
      if (lat == null || lon == null) continue;
      const [x, y] = project(lat, lon, width, height);
      const ageHours = Math.max(0, (Date.now() - event.timestamp) / 3_600_000);
      const opacity = Math.max(0.25, 1 - ageHours / 168);
      const radius = event.confidence === 'high' ? 5 : event.confidence === 'medium' ? 4 : 3;
      points.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" data-event-id="${esc(event.id)}" class="mena-map-event-point" fill="currentColor" opacity="${opacity.toFixed(2)}"><title>${esc(event.title)}</title></circle>`);
    }

    const labels = COUNTRIES.map(([code, _name, lat, lon]) => {
      const [x, y] = project(lat, lon, width, height);
      const count = counts.get(code) ?? 0;
      return `<g><circle cx="${x}" cy="${y}" r="2" class="mena-map-country"></circle><text x="${x + 6}" y="${y + 3}" class="mena-map-label">${esc(code)} · ${count}</text></g>`;
    }).join('');

    this.setCount(mappedEvents.length);
    this.body.innerHTML = `
      <div class="mena-map-meta"><span>7-day event activity</span><span>${mappedEvents.length} mapped observations</span><span>Dots fade with age</span></div>
      <div class="mena-map-canvas">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Schematic MENA event map">
          <rect x="0" y="0" width="${width}" height="${height}" class="mena-map-surface"></rect>
          <path d="M20 70H740M20 140H740M20 210H740M20 280H740M20 350H740M110 15V405M220 15V405M330 15V405M440 15V405M550 15V405M660 15V405" class="mena-map-grid"></path>
          ${labels}
          <g class="mena-map-events">${points.join('')}</g>
        </svg>
      </div>
      <div class="mena-map-note">Schematic regional projection. Precise coordinates are used when present; otherwise events are plotted at the country reference centroid. Select a point to inspect evidence.</div>`;
    this.body.querySelectorAll<SVGCircleElement>('[data-event-id]').forEach((point) => {
      point.addEventListener('click', () => selectMenaEvent(point.dataset.eventId ?? null));
      point.style.cursor = 'pointer';
    });
  }
}
