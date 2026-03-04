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
      spawnCrystal: (topicId: string) => void;
      makeAllConceptsDue: () => void;
      setCurrentConcept: (conceptId: string) => void;
      openStudyPanel: () => void;
      getState: () => {
        concepts: number;
        activeCrystals: number;
        lockedTopics: number;
        unlockPoints: number;
        studyQueue: number;
      };
    };
  }
}

// Export empty object to make this a module
export {};
