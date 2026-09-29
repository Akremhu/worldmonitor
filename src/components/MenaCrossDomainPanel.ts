import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { correlateMenaDomains, type MenaDomain } from '@/services/mena-cross-domain-correlation';
import { selectMenaEvent } from '@/services/mena-event-selection';

const LABELS: Record<MenaDomain, string> = {
  events: 'Events', entities: 'Entities', military: 'Military', maritime: 'Maritime',
  airspace: 'Airspace', infrastructure: 'Infrastructure', energy: 'Energy', history: 'History',
};

export class MenaCrossDomainPanel extends Panel {
  private body: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  constructor() {
    super({
      id: 'mena-cross-domain',
      title: 'MENA Cross-Domain Correlation',
      showCount: true,
      className: 'panel-wide',
      collapsible: true,
      infoTooltip: 'Descriptive convergence across evidence domains. It does not establish attribution, intent, causality, or responsibility.',
    });
    this.body = document.createElement('div');
    this.body.className = 'mena-cross-domain-body';
    this.content.appendChild(this.body);
    this.render();
    this.unsubscribe = subscribeMenaIntelligenceStore(() => this.render());
  }
  override destroy(): void { this.unsubscribe?.(); this.unsubscribe = null; super.destroy(); }
  private render(): void {
    const signals = correlateMenaDomains(getMenaIntelligenceStore().events);
    this.setCount(signals.length);
    this.body.replaceChildren();
    if (!signals.length) {
      const empty = document.createElement('div');
      empty.className = 'mena-detail-empty';
      empty.textContent = 'No cross-domain convergence signals are available yet.';
      this.body.appendChild(empty);
      return;
    }
    for (const signal of signals.slice(0, 25)) {
      const event = getMenaIntelligenceStore().events.find(e => e.id === signal.eventId);
      if (!event) continue;
      const row = document.createElement('article');
      row.className = 'mena-cross-domain-row';
      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'mena-cross-domain-event';
      title.textContent = event.title;
      title.addEventListener('click', () => selectMenaEvent(event.id));
      const domains = document.createElement('div');
      domains.className = 'mena-cross-domain-domains';
      domains.textContent = signal.domains.map(d => LABELS[d]).join(' · ');
      const meta = document.createElement('div');
      meta.className = 'mena-cross-domain-meta';
      meta.textContent = `${Math.round(signal.strength * 100)}% convergence · ${signal.reasons.join(' · ')} · ${signal.sourceIds.length} sources`;
      row.append(title, domains, meta);
      this.body.appendChild(row);
    }
  }
}
