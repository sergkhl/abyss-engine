import { appEventBus } from '@/infrastructure/eventBus';
import type { StudyChecklist } from '@/types/studyChecklist';

export function triggerSubjectGeneration(subjectId: string, checklist: StudyChecklist): void {
  appEventBus.emit('subject:generation-pipeline', { subjectId, checklist });
}
