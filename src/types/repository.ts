export interface Manifest {
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  themeId: string;
  color: string;
  geometry: SubjectGeometry;
}

export interface SubjectGeometry {
  gridTile: GeometryType;
  crystal: GeometryType;
  altar: GeometryType;
}

export type GeometryType = 'box' | 'cylinder' | 'sphere' | 'octahedron' | 'plane';

export interface SubjectGraph {
  subjectId: string;
  title: string;
  themeId: string;
  maxTier: number;
  nodes: GraphNode[];
}

export interface GraphNode {
  topicId: string;
  title: string;
  tier: number;
  prerequisites: string[];
  learningObjective: string;
}

export interface TopicDetails {
  topicId: string;
  title: string;
  subjectId: string;
  coreConcept: string;
  theory: string;
  keyTakeaways: string[];
}

export interface Card {
  id: string;
  type: 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE';
  difficulty: number;
  content: FlashcardContent | SingleChoiceContent | MultiChoiceContent;
}

export interface TopicCardGroup {
  topicId: string;
  cards: Card[];
}

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

export interface IDeckRepository {
  getManifest(): Promise<Manifest>;
  getSubjectGraph(subjectId: string): Promise<SubjectGraph>;
  getTopicDetails(subjectId: string, topicId: string): Promise<TopicDetails>;
  getTopicCards(subjectId: string, topicId: string): Promise<Card[]>;
}
