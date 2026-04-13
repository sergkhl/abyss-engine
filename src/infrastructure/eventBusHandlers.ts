import type { AppEventMap } from './eventBus';
import { appEventBus } from './eventBus';
import { telemetry } from '@/features/telemetry';
import { crystalCeremonyStore } from '@/features/progression/crystalCeremonyStore';
import { deckRepository, deckWriter } from './di';
import { getChatCompletionsRepositoryForSurface } from './llmInferenceRegistry';
import { runExpansionJob } from '@/features/contentGeneration/jobs/runExpansionJob';
import { runTopicUnlockPipeline } from '@/features/contentGeneration/pipelines/runTopicUnlockPipeline';
import { createSubjectGenerationOrchestrator } from '@/features/subjectGeneration';
import { resolveModelForSurface } from './llmInferenceSurfaceProviders';

const g = globalThis as typeof globalThis & {
  __abyssEventBusHandlersRegistered?: boolean;
};

function assertStudyPanelHistoryContext(
  e: AppEventMap['study-panel:history'],
): asserts e is AppEventMap['study-panel:history'] & { topicId: string; sessionId: string } {
  if (!e.topicId?.trim() || !e.sessionId?.trim()) {
    throw new Error(
      `study-panel:history (${e.action}) requires non-empty topicId and sessionId`,
    );
  }
}

if (!g.__abyssEventBusHandlersRegistered) {
  g.__abyssEventBusHandlersRegistered = true;

  const activeExpansionJobs = new Map<string, AbortController>();

  appEventBus.on('card:reviewed', (e) => {
    telemetry.log(
      'study_card_reviewed',
      {
        cardId: e.cardId,
        rating: e.rating,
        isCorrect: e.isCorrect,
        difficulty: e.difficulty,
        timeTakenMs: e.timeTakenMs,
        buffMultiplier: e.buffMultiplier,
      },
      { topicId: e.topicId, sessionId: e.sessionId },
    );
    telemetry.log(
      'xp_gained',
      {
        amount: e.buffedReward,
        topicId: e.topicId,
        sessionId: e.sessionId,
        cardId: e.cardId,
      },
      { topicId: e.topicId, sessionId: e.sessionId },
    );
  });

  appEventBus.on('xp:gained', (e) => {
    telemetry.log(
      'xp_gained',
      {
        amount: e.amount,
        topicId: e.topicId,
        sessionId: e.sessionId,
        cardId: e.cardId,
      },
      { topicId: e.topicId, sessionId: e.sessionId },
    );
  });

  appEventBus.on('topic:unlock-pipeline', (e) => {
    void runTopicUnlockPipeline({
      chat: getChatCompletionsRepositoryForSurface('topicContent'),
      deckRepository,
      writer: deckWriter,
      subjectId: e.subjectId,
      topicId: e.topicId,
      enableThinking: e.enableThinking ?? false,
    });
  });

  appEventBus.on('subject:generation-pipeline', (e) => {
    const chat = getChatCompletionsRepositoryForSurface('subjectGeneration');
    const model = resolveModelForSurface('subjectGeneration');
    const orchestrator = createSubjectGenerationOrchestrator();
    void orchestrator.execute(
      { subjectId: e.subjectId, checklist: e.checklist },
      { chat, writer: deckWriter, model, enableThinking: false },
    );
  });

  appEventBus.on('crystal:leveled', (e) => {
    telemetry.log(
      'level_up',
      { topicId: e.topicId, fromLevel: e.from, toLevel: e.to },
      { topicId: e.topicId },
    );

    crystalCeremonyStore
      .getState()
      .notifyLevelUp(e.topicId, e.isStudyPanelOpen);

    if (e.to >= 2 && e.to <= 3) {
      const prev = activeExpansionJobs.get(e.topicId);
      prev?.abort();
      const ac = new AbortController();
      activeExpansionJobs.set(e.topicId, ac);
      void runExpansionJob({
        chat: getChatCompletionsRepositoryForSurface('topicContent'),
        deckRepository,
        writer: deckWriter,
        topicId: e.topicId,
        nextLevel: e.to,
        enableThinking: false,
        signal: ac.signal,
      }).finally(() => {
        activeExpansionJobs.delete(e.topicId);
      });
    }
  });

  appEventBus.on('session:completed', (e) => {
    telemetry.log(
      'study_session_complete',
      {
        sessionId: e.sessionId,
        topicId: e.topicId,
        totalAttempts: e.totalAttempts,
        correctRate: e.correctRate,
        sessionDurationMs: e.sessionDurationMs,
      },
      { topicId: e.topicId, sessionId: e.sessionId },
    );
  });

  appEventBus.on('ritual:submitted', (e) => {
    telemetry.log(
      'attunement_ritual_submitted',
      {
        harmonyScore: e.harmonyScore,
        readinessBucket: e.readinessBucket,
        checklistKeys: e.checklistKeys,
        buffsGranted: e.buffsGranted.map((b) => b.buffId),
      },
      { topicId: e.topicId },
    );
  });

  appEventBus.on('study-panel:history', (e) => {
    assertStudyPanelHistoryContext(e);

    if (e.action === 'submit') {
      telemetry.log(
        'study_session_start',
        {
          sessionId: e.sessionId,
          topicId: e.topicId,
        },
        { sessionId: e.sessionId, topicId: e.topicId },
      );
    }
    if (e.action === 'undo') {
      telemetry.log(
        'study_undo',
        {
          topicId: e.topicId,
          sessionId: e.sessionId,
          undoCount: e.undoCount,
          redoCount: e.redoCount,
        },
        { sessionId: e.sessionId, topicId: e.topicId },
      );
    }
    if (e.action === 'redo') {
      telemetry.log(
        'study_redo',
        {
          topicId: e.topicId,
          sessionId: e.sessionId,
          undoCount: e.undoCount,
          redoCount: e.redoCount,
        },
        { sessionId: e.sessionId, topicId: e.topicId },
      );
    }
  });
}
