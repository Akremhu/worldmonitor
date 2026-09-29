import type { MenaEvent } from '@/config/mena/events';

export type MenaCorrelationRelation = 'corroborates' | 'potentially_contradicts' | 'related';
export interface MenaCorrelation { id: string; eventAId: string; eventBId: string; relation: MenaCorrelationRelation; score: number; reasons: string[]; }

const STOP_WORDS = new Set(['the','and','for','with','from','that','this','into','after','before','said','says','من','في','على','عن','إلى','الى','مع','بعد','قبل','هذا','هذه','التي','الذي','تم','قال','وقالت','فيه','بشأن']);
const NEGATION_MARKERS = ['denied','deny','denies','refutes','refuted','no evidence','not confirmed','did not','نفى','ينفي','نفت','لا يوجد دليل','غير مؤكد','لم يؤكد','لم يحدث','تنفي'];

function normalize(text: string): string[] {
  return text.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token));
}
function overlap(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let shared = 0; for (const token of A) if (B.has(token)) shared++; return shared / Math.max(1, Math.min(A.size, B.size));
}
function hasNegation(event: MenaEvent): boolean { const text = event.title + ' ' + (event.summary ?? ''); return NEGATION_MARKERS.some(marker => text.toLowerCase().includes(marker)); }
function stableId(a: string, b: string): string { const input = a < b ? a + '|' + b : b + '|' + a; let hash = 2166136261; for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); } return 'mc_' + (hash >>> 0).toString(16).padStart(8, '0'); }

export function correlateMenaEvents(events: readonly MenaEvent[], options: { maxHours?: number; minScore?: number; limit?: number } = {}): MenaCorrelation[] {
  const maxHours = options.maxHours ?? 24; const minScore = options.minScore ?? 0.55; const limit = Math.min(options.limit ?? 200, 500);
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp); const output: MenaCorrelation[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]; const deltaHours = (b.timestamp - a.timestamp) / 3600000; if (deltaHours > maxHours) break;
      let score = 0; const reasons: string[] = [];
      if (a.eventType === b.eventType) { score += 0.2; reasons.push('same event type'); }
      if (a.location?.countryCode && a.location.countryCode === b.location?.countryCode) { score += 0.2; reasons.push('same country'); }
      if (a.location?.city && a.location.city === b.location.city) { score += 0.15; reasons.push('same city'); }
      const tokenOverlap = overlap(normalize(a.title + ' ' + (a.summary ?? '')), normalize(b.title + ' ' + (b.summary ?? '')));
      if (tokenOverlap >= 0.75) { score += 0.45; reasons.push('high lexical overlap'); } else if (tokenOverlap >= 0.55) { score += 0.3; reasons.push('moderate lexical overlap'); }
      if (deltaHours <= 2) { score += 0.15; reasons.push('close in time'); }
      if (score < minScore) continue;
      const contradictionSignal = hasNegation(a) !== hasNegation(b) && tokenOverlap >= 0.55;
      const relation: MenaCorrelationRelation = contradictionSignal ? 'potentially_contradicts' : tokenOverlap >= 0.55 ? 'corroborates' : 'related';
      if (contradictionSignal) reasons.push('conflicting/negation language detected');
      output.push({ id: stableId(a.id, b.id), eventAId: a.id, eventBId: b.id, relation, score: Math.min(1, score), reasons });
    }
  }
  return output.sort((a, b) => b.score - a.score).slice(0, limit);
}