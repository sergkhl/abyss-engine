'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useProgressionStore as useStudyStore } from '@/features/progression';
import { useUIStore } from '@/store/uiStore';
import { Rating } from '@/types';

import { playPositiveSound } from '@/utils/sound';
import { initAbyssDev } from '@/utils/abyssDev';

// Components
import StatsOverlay from '@/components/StatsOverlay';
import DiscoveryModal from '@/components/DiscoveryModal';
import StudyPanelModal from '@/components/StudyPanelModal';
import SubjectNavigation from '@/components/SubjectNavigation';

// Dynamic import for Scene to avoid SSR issues with Three.js
const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-slate-200 text-2xl">
      Loading 3D Scene...
    </div>
  ),
});

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
  const currentSession = useStudyStore((state) => state.currentSession);
  const dueCards = useStudyStore((state) => {
    const queueCardIds = state.currentSession?.queueCardIds ?? [];
    const queueCardRefs = queueCardIds.map((cardId) => ({ id: cardId }));
    return state.getDueCardsCount ? state.getDueCardsCount(queueCardRefs) : queueCardIds.length;
  });
  const totalCards = useStudyStore((state) => {
    const queueCardIds = state.currentSession?.queueCardIds ?? [];
    const queueCardRefs = queueCardIds.map((cardId) => ({ id: cardId }));
    return state.getTotalCardsCount ? state.getTotalCardsCount(queueCardRefs) : queueCardIds.length;
  });
  const activeCrystals = useStudyStore(s => s.activeCrystals);
  const lockedTopics = useStudyStore(s => s.lockedTopics);
  const levelUpMessage = useStudyStore(s => s.levelUpMessage);
  const unlockPoints = useStudyStore(s => s.unlockPoints);

  // Get store actions - stable references
  const initialize = useStudyStore(s => s.initialize);
  const flipCurrentCard = useStudyStore(s => s.flipCurrentCard);
  const submitStudyResult = useStudyStore(s => s.submitStudyResult);
  const isCurrentCardFlipped = useStudyStore(s => s.isCurrentCardFlipped);

  // UI store - modal state - stable selectors
  const isDiscoveryModalOpen = useUIStore(s => s.isDiscoveryModalOpen);
  const isStudyPanelOpen = useUIStore(s => s.isStudyPanelOpen);
  const closeDiscoveryModal = useUIStore(s => s.closeDiscoveryModal);
  const closeStudyPanel = useUIStore(s => s.closeStudyPanel);

  // Study panel feedback state
  const [studyFeedback, setStudyFeedback] = useState<string | null>(null);

  const currentTopicId = currentSession?.topicId || null;

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

  const handleRate = (cardId: string, isCorrect?: boolean, selfRating?: Rating) => {
    const reviewRating = selfRating ?? (isCorrect === undefined ? 3 : isCorrect ? 3 : 1);

    if (reviewRating >= 3) {
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
      submitStudyResult(cardId || currentSession?.currentCardId || '', reviewRating);
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
        <SubjectNavigation />

        {/* Full Screen 3D Scene */}
        <div className="absolute inset-0">
          <Scene />
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
          onClose={handleCloseDiscoveryModal}
        />

        {/* Study Panel Modal */}
        <StudyPanelModal
          isOpen={isStudyPanelOpen}
          currentCardId={currentSession?.currentCardId || null}
          currentTopicId={currentTopicId}
          isCardFlipped={isCurrentCardFlipped}
          totalCards={currentSession?.totalCards ?? totalCards}
          feedbackMessage={studyFeedback}
          levelUpMessage={levelUpMessage}
          onClose={handleCloseStudyPanel}
          onFlip={flipCurrentCard}
          onSubmitResult={handleRate}
        />
      </div>
    </Suspense>
  );
}
