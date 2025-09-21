import OpenAI from 'openai';
export interface Memory {
  extend(messages: OpenAI.ChatCompletionMessageParam[]): void;
  set(messages: OpenAI.ChatCompletionMessageParam[]): void;
  append(message: OpenAI.ChatCompletionMessageParam): void;
  get(): OpenAI.ChatCompletionMessageParam[];
  clear(): void;
}

export class SimpleMemory implements Memory {
  /**
   * Simple memory management for storing past interactions in-memory.
   */
  private history: OpenAI.ChatCompletionMessageParam[] = [];

  constructor() {
    this.history = [];
  }

  static fromMessages(messages: OpenAI.ChatCompletionMessageParam[]): SimpleMemory {
    const memory = new SimpleMemory();
    memory.set(messages);
    return memory;
  }

  extend(messages: OpenAI.ChatCompletionMessageParam[]): void {
    this.history.push(...messages);
  }

  set(messages: OpenAI.ChatCompletionMessageParam[]): void {
    this.history = [...messages]; // Use spread syntax for copy
  }

  append(message: OpenAI.ChatCompletionMessageParam): void {
    this.history.push(message);
  }

  get(): OpenAI.ChatCompletionMessageParam[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }
}