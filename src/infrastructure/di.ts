import { IDeckRepository } from '../types/repository';
import { ApiDeckRepository } from './repositories/ApiDeckRepository';

export const deckRepository: IDeckRepository = new ApiDeckRepository();
