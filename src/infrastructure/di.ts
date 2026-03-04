import { IDeckRepository } from '../types/repository';
import { HttpJsonDeckRepository } from './HttpJsonDeckRepository';

export const deckRepository: IDeckRepository = new HttpJsonDeckRepository();
