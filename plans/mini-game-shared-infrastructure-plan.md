# Mini-Game Shared Infrastructure Plan

## Overview

Shared types, hooks, evaluation harness, LLM generation surface, and a **React + motion** presentation layer for all interactive mini-games. Each mini-game is a thin renderer that composes **`src/components/miniGames/shared/`** primitives (chips, zones, tokens, optional SVG overlays) so styling and feedback animations stay consistent. **Connection Web** additionally uses an **SVG layer only for connector lines** (hybrid layout); it does not use D3 for DOM lifecycle.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Study flow | New `MINI_GAME` CardType in session queue | Reuses entire session/SM-2/XP pipeline |
| Render surface | Inline in AbyssDialog (study panel) | Near-fullscreen on mobile, consistent with study flow |
| LLM generation | Separate generation surface (like AscentWeaver) | Mini-game generation needs higher compute; batch generation per topic |
| Scoring | Binary ≥80% → correct (rating 3), else incorrect (rating 1) | Consistent with existing MCQ binary mapping |
| Touch interaction | Tap-to-select, tap-to-place (no drag) | Mobile-first; avoids scroll conflicts |
| Component architecture | Shared hooks + **`miniGames/shared/`** UI primitives + thin game components | DRY interaction state, **one styling/animation surface** (Tailwind + motion); games must not duplicate chip/zone logic |
| Shared refactor | **Mandated** when introducing `shared/`: **Category Sort** and **Sequence Build** are refactored to use the same shared components | New games and refactors stay aligned; easier global theme tweaks |
| Visual style | Clean/functional with Tailwind tokens | Readability and interaction clarity first |

---

## 1. Type System Extensions

### `src/types/core.ts`

```typescript
export type CardType = 'FLASHCARD' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'MINI_GAME';

export type MiniGameType = 'CATEGORY_SORT' | 'SEQUENCE_BUILD' | 'CONNECTION_WEB';

export interface CategorySortContent {
  gameType: 'CATEGORY_SORT';
  prompt: string;
  categories: { id: string; label: string }[];
  items: { id: string; label: string; categoryId: string }[];
  explanation: string;
}

export interface SequenceBuildContent {
  gameType: 'SEQUENCE_BUILD';
  prompt: string;
  items: { id: string; label: string; correctPosition: number }[];
  explanation: string;
}

export interface ConnectionWebContent {
  gameType: 'CONNECTION_WEB';
  prompt: string;
  pairs: { id: string; left: string; right: string }[];
  distractors?: { side: 'left' | 'right'; label: string }[];
  explanation: string;
}

export type MiniGameContent = CategorySortContent | SequenceBuildContent | ConnectionWebContent;
```

Extend the `Card` interface's `content` union to include `MiniGameContent`.

### `src/types/miniGame.ts` (new)

```typescript
export type MiniGamePhase = 'playing' | 'submitted' | 'reviewed';

export interface MiniGamePlacement {
  itemId: string;
  targetId: string;
}

export interface MiniGameResult {
  totalItems: number;
  correctItems: number;
  score: number;         // 0-1
  isCorrect: boolean;    // score >= 0.8
  placements: MiniGamePlacement[];
}
```

---

## 2. Shared Hooks

### `src/hooks/useMiniGameInteraction.ts`

Manages tap-to-select, tap-to-place state machine for all game types.

**State:**

```typescript
interface MiniGameInteractionState {
  selectedItemId: string | null;     // currently tapped/highlighted item
  placements: Map<string, string>;   // itemId → targetId
  phase: MiniGamePhase;              // playing | submitted | reviewed
  correctItemIds: Set<string>;       // populated after submission
  incorrectItemIds: Set<string>;     // populated after submission
}
```

**API:**

```typescript
function useMiniGameInteraction(config: {
  itemIds: string[];
  evaluateFn: (placements: Map<string, string>) => MiniGameResult;
}): {
  // State
  selectedItemId: string | null;
  placements: ReadonlyMap<string, string>;
  phase: MiniGamePhase;
  correctItemIds: ReadonlySet<string>;
  incorrectItemIds: ReadonlySet<string>;
  result: MiniGameResult | null;

  // Actions
  selectItem: (itemId: string) => void;      // tap an unplaced item → highlight
  placeItem: (targetId: string) => void;      // tap a target → place selected item
  removeItem: (itemId: string) => void;       // tap a placed item → return to pool
  submit: () => void;                         // evaluate placements
  reset: () => void;                          // clear all placements

  // Derived
  unplacedItemIds: string[];
  isComplete: boolean;                        // all items placed
  canSubmit: boolean;                         // all items placed && phase === 'playing'
}
```

**Interaction flow:**

1. Tap unplaced item → `selectItem(itemId)` → highlights it
2. Tap target zone → `placeItem(targetId)` → item moves to zone, deselects
3. Tap placed item → `removeItem(itemId)` → returns to pool
4. Tap "Submit" → `submit()` → runs `evaluateFn`, populates correct/incorrect sets
5. Phase moves to `'submitted'` → UI shows feedback → Continue button calls `onSubmitResult`

### `useMiniGameSvgContainer` (optional — not part of the default stack)

A responsive SVG sizing hook was spec’d for an older “all-SVG” approach. **Current standard:** mini-games use **CSS layout** (flex/grid) and **`motion/react` `LayoutGroup`** where shared layout animation helps; no global SVG stage is required.

If a future game needs a fixed **viewBox** or a full SVG canvas, a small `useMiniGameSvgContainer` (ResizeObserver + dimensions) may be added **ad hoc**—it is **not** a dependency for Category Sort, Sequence Build, or Connection Web.

---

## 3. Card Presenter Extension

### `src/features/studyPanel/cardPresenter.ts`

```typescript
export type RenderableType = 'flashcard' | 'single_choice' | 'multi_choice' | 'mini_game';

export interface RenderableCard {
  id: string;
  type: RenderableType;
  question: string;
  answer?: string;
  options?: string[];
  correctAnswers?: string[];
  context?: string;
  miniGame?: MiniGameContent;  // populated when type === 'mini_game'
}
```

Add a `MINI_GAME` branch in `toRenderableCard`:

```typescript
if (card.type === 'MINI_GAME') {
  const content = card.content as MiniGameContent;
  return {
    id: card.id,
    type: 'mini_game',
    question: content.prompt,
    context: content.explanation,
    miniGame: content,
  };
}
```

---

## 4. Evaluation Harness

### `src/features/content/evaluateMiniGame.ts`

```typescript
import { MiniGameContent, CategorySortContent, SequenceBuildContent, ConnectionWebContent } from '../../types/core';
import { MiniGameResult, MiniGamePlacement } from '../../types/miniGame';

const CORRECT_THRESHOLD = 0.8;

export function evaluateMiniGame(
  content: MiniGameContent,
  placements: Map<string, string>,
): MiniGameResult {
  switch (content.gameType) {
    case 'CATEGORY_SORT':
      return evaluateCategorySort(content, placements);
    case 'SEQUENCE_BUILD':
      return evaluateSequenceBuild(content, placements);
    case 'CONNECTION_WEB':
      return evaluateConnectionWeb(content, placements);
  }
}

// itemId → categoryId
function evaluateCategorySort(content: CategorySortContent, placements: Map<string, string>): MiniGameResult { ... }

// itemId → position string ("0", "1", "2", ...)
function evaluateSequenceBuild(content: SequenceBuildContent, placements: Map<string, string>): MiniGameResult { ... }

// leftId → rightId
function evaluateConnectionWeb(content: ConnectionWebContent, placements: Map<string, string>): MiniGameResult { ... }

export function miniGameResultToIsCorrect(result: MiniGameResult): boolean {
  return result.score >= CORRECT_THRESHOLD;
}
```

### `src/features/content/evaluateAnswer.ts` — extend

Add a branch for `MINI_GAME` that delegates to `evaluateMiniGame`. Or keep `evaluateAnswer` for choice types only and let `StudyPanelModal` call `evaluateMiniGame` directly for mini-game cards (cleaner separation).

**Recommended: keep them separate.** `evaluateAnswer` stays pure for SC/MC. `evaluateMiniGame` is a new export from `features/content/`.

---

## 5. StudyPanelModal Integration

### Detection in `StudyPanelModal.tsx`

```typescript
const isMiniGame = model.renderedCard?.type === 'mini_game';
```

When `isMiniGame && activeTab === 'study'`:
- Render `<MiniGameView>` instead of `<StudyPanelStudyView>`
- `MiniGameView` receives `renderedCard.miniGame` content
- On game completion: calls `onSubmitResult(cardId, isCorrect)` — same path as MCQ

### `src/components/studyPanel/MiniGameView.tsx` (new)

Thin orchestrator that:
1. Receives `MiniGameContent` + `onComplete(isCorrect: boolean)` + `onContinue()`
2. Switches on `content.gameType` to render the correct game component
3. Uses `useMiniGameInteraction` for shared state
4. Renders submit/continue buttons consistent with existing study panel UX
5. Shows explanation text after submission (from `content.explanation`)

```
<MiniGameView>
  ├── <prompt text>
  ├── <game component>  ← switches on gameType; composes miniGames/shared
  ├── <submit / continue button>
  └── <explanation (post-submit)>
</MiniGameView>
```

---

## 6. LLM Generation Surface

### New Inference Surface

`src/types/llmInference.ts`:

```typescript
export type InferenceSurfaceId =
  | 'studyQuestionExplain'
  | 'studyFormulaExplain'
  | 'studyQuestionMermaid'
  | 'screenCaptureSummary'
  | 'ascentWeaver'
  | 'miniGameWeaver';   // new
```

Route to Gemini in `llmInferenceSurfaceProviders.ts` (same as AscentWeaver — higher compute).

### Feature Module: `src/features/miniGameWeaver/`

Following the AscentWeaver pattern:

```
src/features/miniGameWeaver/
  ├── index.ts
  ├── buildMiniGameMessages.ts         // prompt builder
  ├── parseMiniGameResponse.ts         // JSON extraction + Zod parse
  ├── miniGameContentSchema.ts         // Zod schemas
  ├── validateMiniGameContent.ts       // domain validation
  └── applyMiniGamesToIndexedDb.ts     // persist via deckContentWriter
```

### Prompt Template: `src/prompts/mini-game-generate.prompt`

```
Act as an expert educator and game designer. Generate interactive mini-games
for the topic described below.

Topic: {{topicId}} — "{{topicTitle}}"
Subject: {{subjectTitle}}
Core concept: {{coreConcept}}
Key takeaways: {{keyTakeaways}}
Target audience: {{audience}}

Generate exactly {{gameCount}} mini-games. For each game, choose the most
pedagogically appropriate type from: CATEGORY_SORT, SEQUENCE_BUILD, CONNECTION_WEB.

Requirements:
- Each game must test understanding of the topic's core concepts
- Items must be concise (≤8 words each) for mobile readability
- Category Sort: 2-4 categories, 6-10 items
- Sequence Build: 4-8 items
- Connection Web: 4-7 pairs, 0-2 distractors per side
- Distractors must be plausible to test deep understanding
- Include a clear explanation for each game

Output ONLY valid JSON matching this schema:
{
  "topicId": "{{topicId}}",
  "games": [
    {
      "gameType": "CATEGORY_SORT",
      "prompt": "Sort these into the correct category",
      "categories": [{ "id": "cat-1", "label": "Category Name" }],
      "items": [{ "id": "item-1", "label": "Item Name", "categoryId": "cat-1" }],
      "explanation": "Why items belong to their categories..."
    }
  ]
}
```

### Zod Schema: `src/features/miniGameWeaver/miniGameContentSchema.ts`

Validate `gameType` discriminator, required fields per type, item count constraints, referential integrity (all `categoryId` values reference valid categories, all `correctPosition` values are unique and sequential, etc.).

### Hook: `src/hooks/useMiniGameWeaver.ts`

Mirrors `useAscentWeaverCurriculumGraph`:

```typescript
function useMiniGameWeaver({ chat, writer }: { chat: IChatCompletionsRepository; writer: IDeckContentWriter }) {
  // streaming state, generation ref, error state
  // generateAndApply(input) → stream → parse → validate → merge into topic's cards in IndexedDB
}
```

The generated mini-game content is converted to `Card` objects with `type: 'MINI_GAME'` and appended to the topic's existing cards via `upsertTopicCards`.

---

## 7. React + motion rendering foundations

### Principles

- **Presentation layer:** `motion/react` (LayoutGroup where layout-id continuity helps), Tailwind classes, shadcn primitives from `src/components/ui/*` only where already used (e.g. in `MiniGameView`).
- **No `src/components/ui` additions** for mini-game–specific widgets—shared game UI lives under **`src/components/miniGames/shared/`** (project rule: do not add new arbitrary files under `ui/` without an explicit request).
- **D3:** not used for mini-game UIs. The repo may use D3 elsewhere (e.g. force graphs); mini-games stay declarative React.
- **Hybrid SVG:** only where geometry is awkward in CSS alone—e.g. **Connection Web** connector lines between columns (`<line>` or `<path>` in an overlay SVG sized to the game region). Nodes remain HTML + motion.

### Shared visual primitives (`src/components/miniGames/shared/`)

Extract and reuse across **Category Sort**, **Sequence Build**, and **Connection Web** (mandated refactor for the first two when shared lands):

| Piece | Role |
|---|---|
| **`MiniGameItemChip`** (or equivalent) | Rounded bordered button/chip; label + truncation; states `default` \| `selected` \| `correct` \| `incorrect`; spring layout + shake/pulse from motion |
| **`MiniGameZone`** | Dashed target region; optional header label; “empty” / “valid target” / filled affordances |
| **`miniGameItemStyles.ts`** (or `miniGameTokens.ts`) | Shared class maps / state→Tailwind mapping so games don’t diverge |
| **`MiniGameConnectorLayer`** (optional) | SVG absolutely positioned over a measured wrapper; used by Connection Web for lines only |

**Feedback animations (motion):**

- Correct: brief scale pulse + green border/background tokens
- Incorrect: horizontal shake + destructive tokens  
- No hover-only affordances (CLAUDE.md mobile-first)

**Touch:** `click` / keyboard activation on focusable controls; minimum touch target **44×44px**.

### Mandated refactor (with shared module)

When `miniGames/shared/` is introduced:

1. **Implement** shared chip + zone helpers + tokens.
2. **Refactor** `CategorySortGame.tsx` and `SequenceBuildGame.tsx` to import them (remove duplicated `ItemChip` / style maps in those files).
3. **Implement** `ConnectionWebGame.tsx` using the same **`MiniGameItemChip`** for left/right nodes; add connector SVG layer as needed.

### File structure (target)

```
src/components/miniGames/
  ├── MiniGameView.tsx
  ├── shared/
  │   ├── MiniGameItemChip.tsx       // shared chip (motion.button + layoutId prop)
  │   ├── MiniGameZone.tsx           // dashed zone wrapper
  │   ├── miniGameItemStyles.ts      // state → className (or tokens)
  │   └── MiniGameConnectorLayer.tsx // optional; Connection Web lines
  ├── CategorySortGame.tsx           // composes shared; layout only
  ├── SequenceBuildGame.tsx          // composes shared; layout only
  └── ConnectionWebGame.tsx        // composes shared + connector layer
```

---

## 8. Session Queue Integration

### Card Ordering

Mini-game cards are mixed into the regular session queue. They follow the same SM-2 scheduling and difficulty gating as other card types. The `difficulty` field on the `Card` object controls when mini-games appear relative to crystal level.

### Difficulty Strategy

LLM-generated mini-games should span **all difficulty levels (1-4)**, matching the topic's progression curve:
- **Difficulty 1**: Foundational sorting/classification (appears immediately alongside introductory flashcards)
- **Difficulty 2**: Intermediate concepts requiring multi-step reasoning
- **Difficulty 3-4**: Advanced edge cases, subtle distinctions, and cross-topic synthesis

This ensures mini-games reinforce learning at every stage of crystal growth rather than clustering at a single tier.

---

## 9. Testing Strategy

### Unit Tests

| Module | Test File | Coverage |
|---|---|---|
| `evaluateMiniGame` | `evaluateMiniGame.test.ts` | All three game type evaluators, edge cases (empty placements, partial correct, threshold boundary) |
| `useMiniGameInteraction` | `useMiniGameInteraction.test.ts` | State transitions: select→place→remove→submit→reset, phase guards |
| `miniGameContentSchema` | `miniGameContentSchema.test.ts` | Zod validation for each game type, referential integrity checks |
| `parseMiniGameResponse` | `parseMiniGameResponse.test.ts` | JSON extraction from fenced/raw text, malformed input handling |
| `toRenderableCard` | Extend existing test | `MINI_GAME` branch returns correct `miniGame` field |

### Component Tests

| Component | Coverage |
|---|---|
| `MiniGameView` | Renders correct game component per `gameType`, submit/continue flow |
| Shared chip/zone | Visual states and min touch size |
| Each game component | Expected nodes/zones/slots, tap interactions update `useMiniGameInteraction` |

---

## 10. Files Changed Summary

### New Files

| Path | Layer | Purpose |
|---|---|---|
| `src/types/miniGame.ts` | Types | Game phases, placements, results |
| `src/hooks/useMiniGameInteraction.ts` | Composition | Tap-to-select/place state machine |
| `useMiniGameSvgContainer` | Optional | Only if a future game needs explicit SVG canvas sizing |
| `src/hooks/useMiniGameWeaver.ts` | Composition | LLM generation hook |
| `src/features/content/evaluateMiniGame.ts` | Features | Scoring harness |
| `src/features/miniGameWeaver/` | Features | LLM generation pipeline |
| `src/prompts/mini-game-generate.prompt` | Prompts | LLM prompt template |
| `src/components/miniGames/shared/` | Presentation | Shared chips, zones, tokens, optional connector SVG |
| `src/components/miniGames/*Game.tsx` | Presentation | Per-game layout composing shared primitives |

### Modified Files

| Path | Change |
|---|---|
| `src/types/core.ts` | Add `MINI_GAME` to `CardType`, add content interfaces |
| `src/types/llmInference.ts` | Add `'miniGameWeaver'` to `InferenceSurfaceId` |
| `src/features/studyPanel/cardPresenter.ts` | Add `mini_game` to `RenderableType`, add `miniGame` field, add branch in `toRenderableCard` |
| `src/features/content/index.ts` | Re-export `evaluateMiniGame` |
| `src/infrastructure/llmInferenceSurfaceProviders.ts` | Route `miniGameWeaver` to provider |
| `src/components/StudyPanelModal.tsx` | Detect mini-game cards, render `MiniGameView` |
| `src/hooks/useStudyPanelModel.ts` | Add `isMiniGame` derived flag |
