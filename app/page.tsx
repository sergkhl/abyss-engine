'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useProgressionStore as useStudyStore } from '../src/store/progressionStore';
import { useUIStore } from '../src/store/uiStore';
import { Rating } from '../src/types';
import { ensureDeckData, getDeckData } from '../src/data/deckCatalog';
import { useManifest, useSubjectGraphs } from '../src/hooks/useDeckData';
import { Subject, SubjectGraph } from '../src/types/repository';

import { playPositiveSound } from '../src/utils/sound';
import { initAbyssDev } from '../src/utils/abyssDev';

// Components
import StatsOverlay from '../src/components/StatsOverlay';
import DiscoveryModal from '../src/components/DiscoveryModal';
import StudyPanelModal from '../src/components/StudyPanelModal';
import SubjectNavigation from '../src/components/SubjectNavigation';

// Dynamic import for Scene to avoid SSR issues with Three.js
const Scene = dynamic(() => import('../src/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-slate-200 text-2xl">
      Loading 3D Scene...
    </div>
  ),
});

interface TopicMetadata {
  title: string;
  subjectId: string;
  subjectName: string;
}

type TopicMetadataMap = Record<string, TopicMetadata>;

const buildTopicMetadata = (
  subjects: Subject[],
  subjectGraphs: SubjectGraph[],
): TopicMetadataMap => {
  const map: TopicMetadataMap = {};

  subjects.forEach((subject) => {
    const graph = subjectGraphs.find((item) => item.subjectId === subject.id);
    graph?.nodes?.forEach((node) => {
      map[node.topicId] = {
        title: node.title,
        subjectId: subject.id,
        subjectName: subject.name,
      };
    });
  });

  return map;
};

/**
 * Main App Component for Abyss Engine Phase 2
 * Features: Full screen 3D crystal grid, click altar to study
 * Coordinates between the 3D scene and UI modals
 */
export default function Home() {
  // Track initialization to prevent infinite loops
  const initializedRef = useRef(false);

  // Initialize client-side flag
  const [isClient, setIsClient] = useState(false);

  // Get data for StatsOverlay - stable selectors
  const dueCards = useStudyStore(s => s.getDueCardsCount ? s.getDueCardsCount() : s.studyQueue.length);
  const totalCards = useStudyStore(s => s.getTotalCardsCount ? s.getTotalCardsCount() : s.concepts.length);
  const activeCrystals = useStudyStore(s => s.activeCrystals);
  const lockedTopics = useStudyStore(s => s.lockedTopics);
  const levelUpMessage = useStudyStore(s => s.levelUpMessage);
  const currentTopicTheory = useStudyStore(s => s.currentTopicTheory);
  const unlockPoints = useStudyStore(s => s.unlockPoints);

  // Get store actions - stable references
  const loadDeck = useStudyStore(s => s.loadDeck);
  const initialize = useStudyStore(s => s.initialize);
  const getTopicUnlockStatus = useStudyStore(s => s.getTopicUnlockStatus);
  const flipConcept = useStudyStore(s => s.flipConcept);
  const submitStudyResult = useStudyStore(s => s.submitStudyResult);
  const currentConcept = useStudyStore(s => s.currentConcept);
  const currentTopic = useStudyStore(s => s.currentTopic);
  const isConceptFlipped = useStudyStore(s => s.isConceptFlipped);

  // UI store - modal state - stable selectors
  const isDiscoveryModalOpen = useUIStore(s => s.isDiscoveryModalOpen);
  const isStudyPanelOpen = useUIStore(s => s.isStudyPanelOpen);
  const closeDiscoveryModal = useUIStore(s => s.closeDiscoveryModal);
  const closeStudyPanel = useUIStore(s => s.closeStudyPanel);

  // Study panel feedback state
  const [studyFeedback, setStudyFeedback] = useState<string | null>(null);
  const [isDeckLoading, setIsDeckLoading] = useState(false);

  const manifestQuery = useManifest();
  const manifestSubjects = manifestQuery.data?.subjects ?? [];
  const subjectGraphIds = manifestSubjects.map((subject) => subject.id);
  const subjectGraphQuery = useSubjectGraphs(subjectGraphIds);
  const subjectGraphs = subjectGraphQuery.data ?? [];
  const topicMetadata = React.useMemo(
    () => buildTopicMetadata(manifestSubjects, subjectGraphs),
    [manifestSubjects, subjectGraphs],
  );

  const currentTopicId = currentTopic || currentConcept?.topicId || null;

  // Initialize on mount - only once
  useEffect(() => {
    setIsClient(true);

    // Initialize abyssDev for console access
    initAbyssDev();

    // Only initialize once
    if (!initializedRef.current) {
      initializedRef.current = true;
      initialize();
    }
  }, [initialize]);

  // Feedback messages for positive ratings (rating >= 3)
  const positiveMessages = [
    '✨ Excellent!',
    '🌟 Perfect!',
    '💪 Great job!',
    '🎯 Well done!',
    '⭐ Fantastic!',
  ];

  // Feedback messages for negative ratings (rating < 3) - encouraging
  const negativeMessages = [
    '💪 You will do better next time!',
    '📚 Keep practicing!',
    '🌱 Progress takes time!',
    '🔄 You\'re learning!',
    '💫 Keep going!',
  ];

  const handleLoadDeck = async () => {
    if (isDeckLoading) return;

    setIsDeckLoading(true);
    try {
      const deck = await ensureDeckData();

      if (!deck?.subjects?.length || !deck?.topics?.length || !deck?.concepts?.length) {
        console.warn('Deck data is empty or not ready; skipping manual load');
        return;
      }

      // Explicit reset/import path that intentionally replaces the current concept universe.
      loadDeck(deck as unknown as any);
    } catch (error) {
      console.error('Failed to load deck data before manual load', error);
    } finally {
      setIsDeckLoading(false);
    }
  };

  const handleRate = (conceptId: string, isCorrect?: boolean, selfRating?: Rating) => {
    const conceptRating = selfRating ?? (isCorrect === undefined ? 3 : isCorrect ? 3 : 1);

    if (conceptRating >= 3) {
      // Positive feedback - play sound and show encouraging message
      playPositiveSound();
      const randomMessage = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
      setStudyFeedback(randomMessage);

      // Clear feedback after a short delay
      setTimeout(() => setStudyFeedback(null), 1500);
    } else {
      // Negative feedback - only show encouraging message (no sound)
      const randomMessage = negativeMessages[Math.floor(Math.random() * negativeMessages.length)];
      setStudyFeedback(randomMessage);

      // Clear feedback after a short delay
      setTimeout(() => setStudyFeedback(null), 1500);
    }

    // Delay submitting result to allow feedback to be visible first
    setTimeout(() => {
      submitStudyResult(conceptId || currentConcept?.id || '', isCorrect, selfRating);
    }, 500);
  };

  // Discovery Modal handlers
  const handleCloseDiscoveryModal = () => {
    closeDiscoveryModal();
  };

  // Study Panel Modal handlers
  const handleCloseStudyPanel = () => {
    closeStudyPanel();
  };

  if (!isClient) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-slate-200 text-2xl">
        Loading...
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-slate-200 text-2xl">
          Loading deck data...
        </div>
      }
    >
      <div className="w-screen h-screen relative overflow-hidden">
        {/* Subject Navigation - 2D Dropdown for Multi-Floor selection */}
        <SubjectNavigation subjects={manifestSubjects} />

        {/* Full Screen 3D Scene */}
        <div className="absolute inset-0">
          <Scene topicMetadata={topicMetadata} />
        </div>

        {/* Stats Overlay */}
        <StatsOverlay
          totalCards={totalCards}
          dueCards={dueCards}
          activeTopics={activeCrystals.length}
          lockedTopics={lockedTopics.length}
        />

        {/* Title */}
        <div className="absolute top-5 right-5 z-10 text-right">
          <h1 className="text-2xl m-0 bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            🌊 Abyss Engine
          </h1>
          {unlockPoints > 0 && (
            <p className="text-amber-400 text-sm m-0 font-semibold">
              🔓 {unlockPoints} Unlock Point{unlockPoints !== 1 ? 's' : ''} available
            </p>
          )}
        </div>

        {/* Discovery Modal - Tiered Skill Tree */}
        <DiscoveryModal
          isOpen={isDiscoveryModalOpen}
          lockedTopicsCount={lockedTopics.length}
          unlockPoints={unlockPoints}
          getTopicUnlockStatus={getTopicUnlockStatus}
          onClose={handleCloseDiscoveryModal}
        />

        {/* Study Panel Modal */}
        <StudyPanelModal
          isOpen={isStudyPanelOpen}
          currentConceptId={currentConcept?.id || null}
          currentTopicId={currentTopicId}
          topicMetadata={topicMetadata}
          isConceptFlipped={isConceptFlipped}
          totalConcepts={totalCards}
          feedbackMessage={studyFeedback}
          levelUpMessage={levelUpMessage}
          currentTopicTheory={currentTopicTheory}
          onClose={handleCloseStudyPanel}
          onFlip={flipConcept}
          onSubmitResult={handleRate}
          onLoadDeck={handleLoadDeck}
        />
      </div>
    </Suspense>
  );
}
