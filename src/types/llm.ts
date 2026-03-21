export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface ChatCompletionStreamInput {
  model: string;
  messages: ChatMessage[];
  /** When aborted, the stream stops and the iterator completes. */
  signal?: AbortSignal;
}

export interface IChatCompletionsRepository {
  completeChat(input: { model: string; messages: ChatMessage[] }): Promise<string>;
  /** OpenAI-style SSE (`data: {json}` lines); yields `choices[0].delta.content` fragments. */
  streamChat(input: ChatCompletionStreamInput): AsyncIterable<string>;
}
