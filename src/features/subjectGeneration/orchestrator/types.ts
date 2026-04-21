import type { IDeckContentWriter } from '@/types/repository';

import type { SubjectGenerationStageBindings } from './resolveSubjectGenerationStageBindings';

export interface GenerationDependencies {
  stageBindings: SubjectGenerationStageBindings;
  writer: IDeckContentWriter;
  signal?: AbortSignal;
  /** If this execution is a retry, the ID of the original job or pipeline. */
  retryOf?: string;
}
