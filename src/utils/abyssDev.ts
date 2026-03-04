/**
 * Developer Tools for Abyss Engine
 *
 * Provides console API for manipulating game state during development and testing.
 * Access via window.abyssDev in the browser console.
 *
 * Usage:
 *   window.abyssDev.spawnCrystal('topic-id')         // Spawn a crystal
 *   window.abyssDev.makeAllConceptsDue()             // Make all concepts due now
 *   window.abyssDev.setCurrentConcept('concept-id')  // Set current concept
 *   window.abyssDev.openStudyPanel()                 // Open study panel
 */

import { useProgressionStore as useStudyStore } from '../store/progressionStore';
import { uiStore } from '../store/uiStore';

/**
 * Type definitions for AbyssDev
 */
export interface AbyssDevState {
  concepts: number;
  activeCrystals: number;
  lockedTopics: number;
  unlockPoints: number;
  studyQueue: number;
}

export interface AbyssDev {
  spawnCrystal: (topicId: string) => void;
  makeAllConceptsDue: () => void;
  setCurrentConcept: (conceptId: string) => void;
  openStudyPanel: () => void;
  getState: () => AbyssDevState;
}

/**
 * Get the Zustand store state and actions
 */
function getStore() {
  return useStudyStore.getState();
}

/**
 * Reset all SM2 dates to make all concepts due now
 */
function resetAllSM2Dates() {
  const { concepts } = getStore();

  const updatedConcepts = concepts.map(concept => ({
    ...concept,
    sm2: {
      ...concept.sm2,
      dueDate: new Date().toISOString(),
      interval: 0,
      repetitions: 0,
    }
  }));

  useStudyStore.setState({ concepts: updatedConcepts });

  // Refresh study queue
  const { recalculateFromConcepts } = getStore();
  recalculateFromConcepts();

  console.log(`[AbyssDev] Reset SM2 dates for all ${concepts.length} concepts`);
}

/**
 * AbyssDev implementation - only functions used by tests
 */
const abyssDev: AbyssDev = {
  /**
   * Spawn a crystal for a topic (without using unlock points)
   */
  spawnCrystal: (topicId: string) => {
    const { spawnCrystal, lockedTopics, activeCrystals } = getStore();

    // Check if already has crystal
    const existing = activeCrystals.find(c => c.topicId === topicId);
    if (existing) {
      console.log(`[AbyssDev] Crystal already exists for "${topicId}" at position [${existing.gridPosition}]`);
      return;
    }

    // Remove from locked topics
    const newLockedTopics = lockedTopics.filter(id => id !== topicId);
    useStudyStore.setState({ lockedTopics: newLockedTopics });

    // Spawn the crystal
    const position = spawnCrystal(topicId);

    if (position) {
      console.log(`[AbyssDev] Spawned crystal for "${topicId}" at position [${position[0]}, ${position[1]}]`);
    } else {
      console.warn(`[AbyssDev] Could not spawn crystal for "${topicId}" - no space available`);
    }
  },

  /**
   * Make all concepts due for study
   */
  makeAllConceptsDue: () => {
    resetAllSM2Dates();
    console.log(`[AbyssDev] All concepts are now due`);
  },

  /**
   * Set the current concept for study
   */
  setCurrentConcept: (conceptId: string) => {
    const { concepts } = getStore();
    const concept = concepts.find(c => c.id === conceptId);

    if (!concept) {
      console.warn(`[AbyssDev] Concept not found: ${conceptId}`);
      return;
    }

    // Get a random format for this concept
    const formats = concept.formats || [];
    const format = formats.length > 0
      ? formats[Math.floor(Math.random() * formats.length)]
      : null;

    useStudyStore.setState({
      currentConcept: concept,
      currentFormat: format,
      isConceptFlipped: false,
    });

    console.log(`[AbyssDev] Set current concept to "${conceptId}"`);
  },

  /**
   * Open the study panel modal
   */
  openStudyPanel: () => {
    uiStore.getState().openStudyPanel();
    console.log('[AbyssDev] Study panel opened');
  },

  /**
   * Get current state snapshot
   */
  getState: (): AbyssDevState => {
    const { concepts, activeCrystals, lockedTopics, unlockPoints, studyQueue } = getStore();

    const state: AbyssDevState = {
      concepts: concepts.length,
      activeCrystals: activeCrystals.length,
      lockedTopics: lockedTopics.length,
      unlockPoints,
      studyQueue: studyQueue.length,
    };

    console.log(`[AbyssDev] Current state:`, state);
    return state;
  }
};

/**
 * Initialize and expose abyssDev to window
 */
export function initAbyssDev() {
  // Expose to window for console access
  (window as any).abyssDev = abyssDev;

  // Log welcome message
  console.log(`
 🔧 AbyssDev loaded!.
  `);

  return abyssDev;
}

export default abyssDev;
