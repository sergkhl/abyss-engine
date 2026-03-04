import { create } from 'zustand';

/**
 * UI Store interface for managing UI state
 */
export interface UIStore {
  // State
  isDiscoveryModalOpen: boolean;
  isStudyPanelOpen: boolean;
  selectedTopicId: string | null;

  // Computed
  isSelectionMode: boolean;

  // Actions
  openDiscoveryModal: () => void;
  closeDiscoveryModal: () => void;
  openStudyPanel: () => void;
  closeStudyPanel: () => void;
  selectTopic: (topicId: string | null) => void;
}

// Create store without persistence - safe for SSR
// Using createStore pattern for Next.js App Router compatibility
const createUIStore = () =>
  create<UIStore>((set, get) => ({
    // Initial state
    isDiscoveryModalOpen: false,
    isStudyPanelOpen: false,
    selectedTopicId: null,

    // Computed state - derived from selectedTopicId
    get isSelectionMode() {
      return get().selectedTopicId !== null;
    },

    // Actions
    openDiscoveryModal: () => set({ isDiscoveryModalOpen: true }),
    closeDiscoveryModal: () => set({ isDiscoveryModalOpen: false }),
    openStudyPanel: () => set({ isStudyPanelOpen: true }),
    closeStudyPanel: () => set({ isStudyPanelOpen: false }),

    // Select a topic (or clear selection if null)
    selectTopic: (topicId: string | null) => set({ selectedTopicId: topicId }),

  }));

// Create a singleton store - will be created once per module load
// This is safe for UI state that doesn't need persistence
const store = createUIStore();

/**
 * Hook to use the UI store
 * Uses the singleton store instance
 */
export const useUIStore = store;

// Export the raw store for direct access (e.g., in event handlers)
export { store as uiStore };
