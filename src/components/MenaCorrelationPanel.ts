import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';
import { correlateMenaEvents, type MenaCorrelation } from '@/services/mena-event-correlation';
import { selectMenaEvent } from '@/services/mena-event-selection';

export class MenaCorrelationPanel extends Panel {
  private body: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  constructor() {
    super({ id: 'mena-correlation', title: 'MENA Event Correlation', showCount: true, className: 'panel-wide', collapsible: true, infoTooltip: 'Conservative correlation of nearby observations using time, location, event type and text similarity. Potential contradiction is a review signal, not a resolved fact.' });
    this.body = document.createElement('div'); this.body.className = 'mena-correlation-body'; this.content.appendChild(this.body); this.render();
    this.unsubscribe = subscribeMenaIntelligenceStore(() => this.render());
  }
  override destroy(): void { this.unsubscribe?.(); this.unsubscribe = null; super.destroy(); }
  private render(): void {
    const correlations = correlateMenaEvents(getMenaIntelligenceStore().events, { maxHours: 24, minScore: 0.55, limit: 100 });
    this.setCount(correlations.length); this.body.replaceChildren();
    if (!correlations.length) { const empty = document.createElement('div'); empty.className = 'mena-detail-empty'; empty.textContent = 'No sufficiently similar observations are available yet.'; this.body.appendChild(empty); return; }
    for (const correlation of correlations.slice(0, 30)) this.body.appendChild(this.row(correlation));
  }
  private row(correlation: MenaCorrelation): HTMLElement {
    const store = getMenaIntelligenceStore(); const a = store.events.find(e => e.id === correlation.eventAId); const b = store.events.find(e => e.id === correlation.eventBId);
    const row = document.createElement('article'); row.className = 'mena-correlation-row';
    const badge = document.createElement('span'); badge.className = 'mena-correlation-relation'; badge.textContent = correlation.relation.replace(/_/g, ' ');
    const score = document.createElement('span'); score.className = 'mena-correlation-score'; score.textContent = Math.round(correlation.score * 100) + '% match';
    const header = document.createElement('div'); header.className = 'mena-correlation-header'; header.append(badge, score);
    const events = document.createElement('div'); events.className = 'mena-correlation-events';
    for (const event of [a, b]) { if (!event) continue; const button = document.createElement('button'); button.type = 'button'; button.className = 'mena-correlation-event'; button.textContent = event.title; button.addEventListener('click', () => selectMenaEvent(event.id)); events.appendChild(button); }
    const reasons = document.createElement('div'); reasons.className = 'mena-correlation-reasons'; reasons.textContent = correlation.reasons.join(' · ');
    row.append(header, events, reasons); return row;
  }
}