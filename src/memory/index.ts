interface Memory<MessageParamT> {
  extend(messages: MessageParamT[]): void;
  set(messages: MessageParamT[]): void;
  append(message: MessageParamT): void;
  get(): MessageParamT[];
  clear(): void;
}

export class SimpleMemory<MessageParamT> implements Memory<MessageParamT> {
  /**
   * Simple memory management for storing past interactions in-memory.
   */
  private history: MessageParamT[] = [];

  constructor() {
    this.history = [];
  }

  extend(messages: MessageParamT[]): void {
    this.history.push(...messages);
  }

  set(messages: MessageParamT[]): void {
    this.history = [...messages]; // Use spread syntax for copy
  }

  append(message: MessageParamT): void {
    this.history.push(message);
  }

  get(): MessageParamT[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }
}