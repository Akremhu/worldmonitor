import { Panel } from './Panel';
import { fetchMilitaryFlights } from '@/services/military-flights';
import { fetchAisSignals, getAisStatus } from '@/services/maritime';
import { fetchHormuzTracker } from '@/services/hormuz-tracker';

const MENA_BOUNDS = { minLat: 10, maxLat: 42, minLon: 25, maxLon: 65 };

function inMena(lat: number, lon: number): boolean {
  return lat >= MENA_BOUNDS.minLat && lat <= MENA_BOUNDS.maxLat
    && lon >= MENA_BOUNDS.minLon && lon <= MENA_BOUNDS.maxLon;
}

function card(label: string, value: string, detail = ''): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mena-ops-card';
  const strong = document.createElement('strong');
  strong.textContent = value;
  const name = document.createElement('span');
  name.textContent = label;
  el.append(strong, name);
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    el.appendChild(small);
  }
  return el;
}

export class MenaOperationalActivityPanel extends Panel {
  private body: HTMLElement;
  private status: HTMLElement;

  constructor() {
    super({
      id: 'mena-operational-activity',
      title: 'MENA Operational Activity',
      infoTooltip: 'Descriptive aggregation of available aviation, maritime and chokepoint telemetry. Presence or activity does not establish intent, attribution or responsibility.',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
    });

    const controls = document.createElement('div');
    controls.className = 'mena-intel-controls';
    const refresh = document.createElement('button');
    refresh.className = 'mena-history-load';
    refresh.textContent = 'Refresh telemetry';
    this.status = document.createElement('span');
    this.status.className = 'mena-history-status';
    controls.append(refresh, this.status);

    this.body = document.createElement('div');
    this.body.className = 'mena-ops-body';
    this.content.append(controls, this.body);
    refresh.addEventListener('click', () => void this.load());
    void this.load();
  }

  private async load(): Promise<void> {
    this.status.textContent = 'Loading…';
    this.body.replaceChildren();

    const [flightResult, aisResult, hormuz] = await Promise.allSettled([
      fetchMilitaryFlights(),
      fetchAisSignals(),
      fetchHormuzTracker(),
    ]);

    const grid = document.createElement('div');
    grid.className = 'mena-ops-grid';

    let count = 0;
    if (flightResult.status === 'fulfilled') {
      const flights = flightResult.value.flights.filter(f => inMena(f.lat, f.lon));
      count += flights.length;
      const byOperator = new Map<string, number>();
      for (const flight of flights) byOperator.set(flight.operator, (byOperator.get(flight.operator) ?? 0) + 1);
      const operators = [...byOperator.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([operator, n]) => `${operator}: ${n}`).join(' · ');
      grid.appendChild(card('Tracked military aircraft in MENA view', String(flights.length), operators));
    } else {
      grid.appendChild(card('Military aviation', 'Unavailable', 'Upstream telemetry unavailable'));
    }

    if (aisResult.status === 'fulfilled') {
      const signals = aisResult.value;
      count += signals.disruptions.length + signals.density.length;
      const high = signals.disruptions.filter(d => d.severity === 'high').length;
      grid.appendChild(card('AIS disruption signals', String(signals.disruptions.length), high ? `${high} high-severity source signals` : 'No high-severity signal in current snapshot'));
      grid.appendChild(card('AIS density zones', String(signals.density.length), `Relay: ${getAisStatus().connected ? 'connected' : 'stale/unavailable'}`));
    } else {
      grid.appendChild(card('Maritime telemetry', 'Unavailable', 'AIS relay unavailable'));
    }

    if (hormuz.status === 'fulfilled' && hormuz.value) {
      grid.appendChild(card('Strait of Hormuz status', hormuz.value.status, hormuz.value.updatedDate ? `Updated ${hormuz.value.updatedDate}` : 'Source timestamp unavailable'));
    } else {
      grid.appendChild(card('Strait of Hormuz status', 'Unavailable', 'Chokepoint feed unavailable'));
    }

    this.body.appendChild(grid);
    this.setCount(count);
    this.status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  }
}
