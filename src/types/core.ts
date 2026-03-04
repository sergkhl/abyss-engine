export type GeometryType = 'box' | 'cylinder' | 'sphere' | 'octahedron' | 'plane';

export interface SubjectGeometry {
  gridTile: GeometryType;
  crystal: GeometryType;
  altar: GeometryType;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  geometry: SubjectGeometry;
  topicIds?: string[];
}

export interface GraphNode {
  topicId: string;
  title: string;
  tier: number;
  prerequisites: string[];
  learningObjective: string;
}

export interface SubjectGraph {
  subjectId: string;
  title: string;
  themeId: string;
  maxTier: number;
  nodes: GraphNode[];
}

export interface TopicDetails {
  topicId: string;
  title: string;
  subjectId: string;
  coreConcept: string;
  theory: string;
  keyTakeaways: string[];
}

export type CardType = 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE';

export interface FlashcardContent {
  front: string;
  back: string;
}

export interface SingleChoiceContent {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface MultiChoiceContent {
  question: string;
  options: string[];
  correctAnswers: string[];
  explanation: string;
}

export interface Card {
  id: string;
  type: CardType;
  difficulty: number;
  content: FlashcardContent | SingleChoiceContent | MultiChoiceContent;
}

export interface TopicCardGroup {
  topicId: string;
  cards: Card[];
}

export interface ActiveCrystal {
  topicId: string;
  gridPosition: [number, number];
  xp: number;
  spawnedAt: number;
}
