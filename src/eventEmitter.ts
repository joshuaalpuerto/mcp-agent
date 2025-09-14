

// Generic event emitter for a single event name with discriminated union payloads
export class EventEmitter<EventPayload> {
  private listeners: Array<(payload: EventPayload) => void> = [];
  private events: Record<string, Array<(payload: EventPayload) => void>> = {};

  on(event: string, listener: (payload: EventPayload) => void) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  off(event: string, listener: (payload: EventPayload) => void) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, payload: EventPayload) {
    for (const listener of this.events[event] || []) {
      listener(payload);
    }
  }
}