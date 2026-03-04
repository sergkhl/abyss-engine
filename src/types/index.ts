/**
 * SM-2 Card Properties
 * SuperMemo SM-2 spaced repetition algorithm properties
 */
export interface SM2Properties {
  /** Days until next review */
  interval: number;
  /** Ease factor multiplier (min 1.3) */
  ease: number;
  /** Number of successful repetitions */
  repetitions: number;
  /** ISO date string for next due date */
  dueDate: string;
}

/**
 * Geometry types available for 3D elements
 */
export type GeometryType = 'box' | 'cylinder' | 'sphere' | 'octahedron' | 'plane';

/**
 * Subject geometry configuration
 * Defines which 3D primitives to use for each element
 */
export interface SubjectGeometry {
  /** Geometry type for grid tiles */
  gridTile: GeometryType;
  /** Geometry type for crystals */
  crystal: GeometryType;
  /** Geometry type for altar */
  altar: GeometryType;
}

/**
 * ============================================
 * NEW LLM-FRIENDLY DATA STRUCTURES
 * ============================================
 * These types support multi-agent LLM generation
 * and replace the legacy monolithic deck structure.
 */

/**
 * Challenge Type - Polymorphic base for different challenge formats
 * FLASHCARD: Standard front/back flashcard
 * SINGLE_CHOICE: Multiple choice with one correct answer
 * MULTI_CHOICE: Multiple choice with multiple correct answers
 */
export type ChallengeType = 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE';

/**
 * Flashcard content
 */
export interface FlashcardContent {
  front: string;
  back: string;
}

/**
 * Single choice content
 */
export interface SingleChoiceContent {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/**
 * Multi choice content
 */
export interface MultiChoiceContent {
  question: string;
  options: string[];
  correctAnswers: string[];
  explanation: string;
}

/**
 * Card - Unified card structure with content property
 * Separates shared properties from type-specific content
 */
export interface Card {
  id: string;
  type: ChallengeType;
  difficulty: number;
  content: FlashcardContent | SingleChoiceContent | MultiChoiceContent;
}

export interface TopicCardGroup {
  topicId: string;
  cards: Card[];
}

/**
 * Graph Node in the Progression DAG
 * Represents a learning topic with its prerequisites and learning objectives
 */
export interface GraphNode {
  topicId: string;
  title: string;
  tier: number;
  prerequisites: string[];
  learningObjective: string;
}

/**
 * Progression Graph (The Blueprint)
 * Represents the topological map of the curriculum.
 * LLM generates this first to establish the learning path.
 */
export interface ProgressionGraph {
  subjectId: string;
  title: string;
  themeId: string;
  maxTier: number;
  nodes: GraphNode[];
}

// ==========================================
// LEGACY TYPES (for backward compatibility)
// ==========================================

/**
 * Subject in the hierarchical deck structure
 * Represents a high-level category/subject area
 */
export interface Subject {
  /** Unique subject identifier */
  id: string;
  /** Display name of the subject */
  name: string;
  /** Description of the subject */
  description: string;
  /** Color for UI theming (hex color code) */
  color: string;
  /** Geometry preferences for 3D rendering */
  geometry: SubjectGeometry;
  /** Array of topic IDs belonging to this subject */
  topicIds: string[];
}

/**
 * Topic prerequisite requirement
 * Specifies a required topic and minimum level to unlock a new topic
 */
export interface TopicPrerequisite {
  /** ID of the prerequisite topic */
  topicId: string;
  /** Minimum level required on the prerequisite topic */
  requiredLevel: number;
}

/**
 * Topic in the hierarchical deck structure
 * Represents a subcategory within a subject
 */
export interface Topic {
  /** Unique topic identifier */
  id: string;
  /** Display name of the topic */
  name: string;
  /** Description of the topic */
  description: string;
  /** Icon identifier for UI display */
  icon: string;
  /** Required: ID of the subject this topic belongs to */
  subjectId: string;
  /** Array of concept IDs belonging to this topic */
  conceptIds: string[];
  /** Optional: Theory text (Markdown) for structural knowledge */
  theory?: string;
  /** Optional: Prerequisites to unlock this topic */
  prerequisites?: TopicPrerequisite[];
}

/**
 * Format types for Concept questions
 */
export type FormatType = 'flashcard' | 'single_choice' | 'multi_choice';

/**
 * Format interface for different question types
 * A Concept can have multiple formats that are randomly selected during study
 */
export interface Format {
  /** Unique format identifier within the concept */
  id: string;
  /** Type of question format */
  type: FormatType;
  /** Question/prompt shown to user */
  question: string;
  /** Answer (for flashcard type - shown after flip) */
  answer?: string;
  /** Options for choice questions (single_choice, multi_choice) */
  options?: string[];
  /** Correct answer(s) for choice questions */
  correctAnswers?: string[];
  /** Context/explanation shown after answering */
  context?: string;
}

/**
 * Concept interface - replaces Card
 * Represents a learning concept with SM-2 data and multiple question formats
 */
export interface Concept {
  /** Unique concept identifier */
  id: string;
  /** Required: ID of the topic this concept belongs to */
  topicId: string;
  /** Difficulty level (1-4) - gates which concepts are shown based on crystal level */
  difficulty: number;
  /** SM-2 algorithm properties */
  sm2: SM2Properties;
  /** Array of question formats - one is randomly selected during study */
  formats: Format[];
}

/**
 * Unlock Concept type for the unlock concept feature
 * Contains all information needed to display an unlock concept
 */
export interface UnlockConcept {
  /** The concept data */
  concept: Concept;
  /** ID of the topic this concept belongs to */
  topicId: string;
  /** Name of the topic */
  topicName: string;
  /** Name of the subject */
  subjectName: string;
}

/**
 * Rating scale for SM-2 algorithm
 * 1 = Again (complete blackout)
 * 2 = Hard (significant difficulty)
 * 3 = Good (correct with some hesitation)
 * 4 = Easy (perfect recall)
 */
export type Rating = 1 | 2 | 3 | 4;

/**
 * JSON Deck structure with hierarchical data
 * Updated to use Concepts instead of Cards
 * Also supports legacy cards for backward compatibility
 */
export interface Deck {
  subjects: Subject[];
  topics: Topic[];
  concepts?: Concept[];
}

/**
 * Study Store State
 */
export interface StudyState {
  /** All concepts in the deck */
  concepts: Concept[];
  /** Currently active concept being studied */
  currentConcept: Concept | null;
  /** Currently selected format for the active concept */
  currentFormat: Format | null;
  /** Whether the concept is flipped to show answer (for flashcards) */
  isConceptFlipped: boolean;
  /** Concepts due for review today */
  studyQueue: Concept[];
  /** Topics that haven't been unlocked yet */
  lockedTopics: string[];
  /** Active crystals on the grid (topic-based) */
  activeCrystals: ActiveCrystal[];
  /** Currently selected subject ID (for multi-floor 3D rendering) */
  currentSubjectId: string | null;
  /** Currently selected topic (for altar UI) */
  currentTopic: string | null;
  /** Level up notification message (cleared after a few seconds) */
  levelUpMessage: string | null;
  /** Current topic's theory text for display */
  currentTopicTheory: string | null;
  /** Global unlock points earned from leveling up crystals */
  unlockPoints: number;
}

/**
 * Study Store Actions
 */
export interface StudyActions {
  /** Load a deck of concepts */
  loadDeck: (deck: Deck) => void;
  /** Toggle concept flip state (for flashcards) */
  flipConcept: () => void;
  /** Submit study result and update SM-2 values */
  submitStudyResult: (conceptId: string, isCorrect?: boolean, selfRating?: Rating) => void;
  /** Spawn a crystal for a topic at next available position */
  spawnCrystal: (topicId: string) => [number, number] | null;
  /** Get the next available grid position */
  getNextAvailableGridPosition: () => [number, number] | null;
  /** Initialize store - load default deck if no saved data */
  initialize: () => void;
  /** Recalculate study queue and topic levels from existing concepts */
  recalculateFromConcepts: () => void;
  /** Unlock a topic and spawn its crystal */
  unlockTopic: (topicId: string) => [number, number] | null;
  /** Get the unlock status for a topic (includes prerequisites check) */
  getTopicUnlockStatus: (topicId: string) => {
    canUnlock: boolean;
    hasPrerequisites: boolean;
    hasEnoughPoints: boolean;
    missingPrerequisites: { topicId: string; topicName: string; requiredLevel: number; currentLevel: number }[];
  };
  /** Get the tier/depth of a topic in the prerequisite tree */
  getTopicTier: (topicId: string) => number;
  /** Get all topics grouped by tier */
  getTopicsByTier: () => { tier: number; topics: { id: string; name: string; description: string; subjectId: string; subjectName: string; isLocked: boolean; isUnlocked: boolean }[] }[];
  /** Start a topic-focused study session */
  startTopicStudySession: (topicId: string) => void;
  /** Set the current subject for multi-floor 3D rendering */
  setCurrentSubject: (subjectId: string | null) => void;
}

/**
 * Combined Study Store
 */
export type StudyStore = StudyState & StudyActions;

/**
 * Active Crystal on the grid (topic-based)
 * Tracks XP and level for the meta-game progression system
 */
export interface ActiveCrystal {
  /** Grid position [x, z] */
  gridPosition: [number, number];
  /** Topic ID this crystal represents */
  topicId: string;
  /** Current XP earned (level = floor(xp / 100), max level 5) */
  xp: number;
  /** Timestamp when crystal was spawned (for animation) */
  spawnedAt: number;
}
