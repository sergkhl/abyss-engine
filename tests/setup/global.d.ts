import '@playwright/test';

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      /**
       * Custom matcher to check if element contains specific text
       */
      toContainText(text: string): Promise<R>;
    }
  }

  // Extend Window interface for custom properties
  interface Window {
    __FRAME_COUNT__?: number;
    __LAST_FRAME_TIME__?: number;
    abyssDev?: {
      spawnCrystal: (topicId: string) => Promise<void>;
      makeAllCardsDue: () => void;
      setCurrentCard: (cardId: string) => Promise<void>;
      setCurrentCardByType: (cardType: 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE') => Promise<{
        topicId: string;
        cardId: string;
      } | null>;
      getCardByType: (cardType: 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE') => Promise<{
        topicId: string;
        cardId: string;
      } | null>;
      openStudyPanel: () => void;
      getState: () => {
        activeCards: number;
        activeCrystals: number;
        unlockPoints: number;
        queuedCards: number;
      };
    };
  }
}

// Export empty object to make this a module
export {};
