import type { IChatCompletionsRepository } from '@/types/llm';
import type { IDeckContentWriter } from '@/types/repository';

export interface GenerationDependencies {
  chat: IChatCompletionsRepository;
  writer: IDeckContentWriter;
  model: string;
  enableThinking?: boolean;
  signal?: AbortSignal;
}
