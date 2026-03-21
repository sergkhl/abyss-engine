import { IDeckRepository } from '../types/repository';
import type { IChatCompletionsRepository } from '../types/llm';
import { ApiDeckRepository } from './repositories/ApiDeckRepository';
import { createHttpChatCompletionsRepositoryFromEnv } from './repositories/HttpChatCompletionsRepository';

export const deckRepository: IDeckRepository = new ApiDeckRepository();

export const chatCompletionsRepository: IChatCompletionsRepository =
  createHttpChatCompletionsRepositoryFromEnv();
