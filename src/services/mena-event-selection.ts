let selectedEventId: string | null = null;
const listeners = new Set<(eventId: string | null) => void>();

export function selectMenaEvent(eventId: string | null): void {
  selectedEventId = eventId;
  for (const listener of listeners) listener(selectedEventId);
}

export function getSelectedMenaEventId(): string | null {
  return selectedEventId;
}

export function subscribeMenaEventSelection(listener: (eventId: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
