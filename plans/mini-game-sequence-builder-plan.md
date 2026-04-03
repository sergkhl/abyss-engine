# Mini-Game: Sequence Builder — Implementation Plan

> Depends on: [mini-game-shared-infrastructure-plan.md](./mini-game-shared-infrastructure-plan.md)

## Game Description

A horizontal or vertical sequence of numbered slots sits in the upper area of the SVG. Scrambled items sit in a pool at the bottom. The player taps an item to select it, then taps a slot to place it. After all slots are filled, Submit evaluates whether the ordering is correct (≥80% in correct position → rating 3, else rating 1). Feedback highlights each slot green or red. A connecting path/line between slots animates to show the "flow" of the sequence.

**Learning value:** Process ordering and causal reasoning — understanding the correct sequence of steps in a pipeline, algorithm, or process. Tests procedural knowledge that flashcards and MCQs often miss.

---

## 1. Data Schema

### `SequenceBuildContent` (in `src/types/core.ts`)

```typescript
export interface SequenceBuildContent {
  gameType: 'SEQUENCE_BUILD';
  prompt: string;
  items: { id: string; label: string; correctPosition: number }[];
  explanation: string;
}
```

**Constraints:**
- 4–8 items
- `correctPosition` values are 0-indexed, unique, and sequential (0 through N-1)
- Labels ≤ 8 words for mobile readability

### Subject Examples

| Subject | Prompt | Items (correct order) |
|---|---|---|
| Data Science | Arrange the ML pipeline steps | Collect Data → Clean Data → Feature Engineering → Train Model → Evaluate → Deploy |
| Physics | Order the Carnot cycle stages | Isothermal Expansion → Adiabatic Expansion → Isothermal Compression → Adiabatic Compression |
| Robotics | Order the ROS2 node lifecycle | Unconfigured → Inactive → Active → Finalized |

---

## 2. Zod Validation Schema

### `src/features/miniGameWeaver/miniGameContentSchema.ts` (SequenceBuild section)

```typescript
const sequenceBuildItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  correctPosition: z.number().int().min(0),
});

export const sequenceBuildContentSchema = z.object({
  gameType: z.literal('SEQUENCE_BUILD'),
  prompt: z.string().min(1),
  items: z.array(sequenceBuildItemSchema).min(4).max(8),
  explanation: z.string().min(1),
}).refine(
  (data) => {
    const positions = data.items.map(i => i.correctPosition).sort((a, b) => a - b);
    return positions.every((pos, idx) => pos === idx);
  },
  { message: 'correctPosition values must be unique and sequential from 0 to N-1' }
);
```

---

## 3. Evaluation Logic

### `src/features/content/evaluateMiniGame.ts` (SequenceBuild section)

The placements map uses `itemId → slot position string` (e.g., `"0"`, `"1"`, `"2"`).

```typescript
function evaluateSequenceBuild(
  content: SequenceBuildContent,
  placements: Map<string, string>,  // itemId → slotIndex (as string)
): MiniGameResult {
  const totalItems = content.items.length;
  let correctItems = 0;
  const placementList: MiniGamePlacement[] = [];

  for (const item of content.items) {
    const placedSlot = placements.get(item.id);
    const placedPosition = placedSlot !== undefined ? parseInt(placedSlot, 10) : -1;
    const isItemCorrect = placedPosition === item.correctPosition;
    if (isItemCorrect) correctItems++;
    placementList.push({ itemId: item.id, targetId: placedSlot ?? '' });
  }

  const score = totalItems > 0 ? correctItems / totalItems : 0;

  return {
    totalItems,
    correctItems,
    score,
    isCorrect: score >= 0.8,
    placements: placementList,
  };
}
```

---

## 4. D3 Component

### `src/components/miniGames/SequenceBuildGame.tsx`

**SVG Layout (portrait mobile, ~320×400):**

```
┌──────────────────────────────┐
│  ┌───┐   ┌───┐   ┌───┐     │  ← sequence slots (top)
│  │ 1 │ → │ 2 │ → │ 3 │ → …│
│  │   │   │   │   │   │     │
│  └───┘   └───┘   └───┘     │
│                              │
│  (connecting arrows/line     │
│   between filled slots)      │
│                              │
│──────────────────────────────│
│  [item] [item] [item]        │  ← scrambled item pool (bottom)
│  [item] [item] [item]        │
└──────────────────────────────┘
```

For 5+ items, slots wrap to two rows:

```
│  ┌───┐   ┌───┐   ┌───┐     │
│  │ 1 │ → │ 2 │ → │ 3 │     │
│  └───┘   └───┘   └───┘     │
│  ┌───┐   ┌───┐              │
│  │ 4 │ → │ 5 │              │
│  └───┘   └───┘              │
```

**Props:**

```typescript
interface SequenceBuildGameProps {
  content: SequenceBuildContent;
  interaction: ReturnType<typeof useMiniGameInteraction>;
  width: number;
  height: number;
  svgRef: RefObject<SVGSVGElement>;
}
```

**Rendering approach:**

1. **Sequence slots** — Numbered dashed-border `<rect>` elements arranged left-to-right (wrapping). Arrow `<line>` or `<path>` elements connect adjacent slots. Tap handler calls `interaction.placeItem(slotIndex.toString())`.

2. **Scrambled item pool** — Items randomized at render time (shuffle seed from content). Rendered as filled rounded `<rect>` + `<text>` at the bottom. Tap handler calls `interaction.selectItem(itemId)`.

3. **Placed items** — When placed, the item's rect + label animate (D3 transition) into the target slot. The slot number is replaced by the item label. Tap handler on a filled slot calls `interaction.removeItem(itemId)`.

4. **Connecting path** — A `<path>` element drawn through the centers of filled slots. Uses a smooth curve (`d3.curveBasis` or simple straight segments with rounded corners). Only visible for filled slots. Animates in as slots fill.

5. **Post-submission feedback** — Each slot gets green (correct position) or red (wrong position) background. The connecting path turns green if fully correct, or shows breaks at incorrect positions.

**D3 usage:**
- `d3-selection` for SVG element joins
- `d3-transition` for item movement and feedback
- `d3-shape` (optional) for curved connecting path between slots

---

## 5. Interaction Nuance: Swap Behavior

When the player taps a slot that already has an item, then taps another slot:

- If destination is empty: move the item to the new slot
- If destination has an item: swap the two items

This allows reordering without returning items to the pool. Implementation: the `useMiniGameInteraction` hook's `placeItem` checks if the target already has an item and performs a swap in the placements map.

**Alternative (simpler):** tapping a filled slot returns that item to the pool (via `removeItem`). No swap logic needed. This is consistent with Category Sort behavior and keeps the shared hook simpler.

**Recommendation:** Start with the simpler "tap to return" behavior. Swap can be added later if UX testing shows it's needed.

---

## 6. Tests

### Unit: `src/features/content/evaluateMiniGame.test.ts`

```
Sequence Build evaluation
  ✓ returns score 1.0 when all items in correct positions
  ✓ returns score 0.0 when all items in wrong positions
  ✓ returns isCorrect=true at threshold (e.g. 4/5 correct = 0.8)
  ✓ returns isCorrect=false below threshold (e.g. 3/5 correct = 0.6)
  ✓ handles partially placed items (unplaced count as incorrect)
  ✓ handles single swap error (adjacent items swapped)
```

### Component: `src/components/miniGames/SequenceBuildGame.test.tsx`

```
SequenceBuildGame
  ✓ renders correct number of sequence slots
  ✓ renders items in scrambled (non-correct) order in pool
  ✓ item moves to slot when selected then slot tapped
  ✓ filled slot item returns to pool when tapped
  ✓ shows green/red feedback per slot after submission
  ✓ connecting path renders between filled slots
```

---

## 7. New Files

| Path | Purpose |
|---|---|
| `src/components/miniGames/SequenceBuildGame.tsx` | D3 SVG renderer (~170 lines) |
| `src/components/miniGames/SequenceBuildGame.test.tsx` | Component tests |

## 8. Modified Files

| Path | Change |
|---|---|
| `src/types/core.ts` | Add `SequenceBuildContent` interface |
| `src/features/content/evaluateMiniGame.ts` | Add `evaluateSequenceBuild` function |
| `src/features/miniGameWeaver/miniGameContentSchema.ts` | Add `sequenceBuildContentSchema` |
| `src/components/miniGames/MiniGameView.tsx` | Add `SEQUENCE_BUILD` case |
