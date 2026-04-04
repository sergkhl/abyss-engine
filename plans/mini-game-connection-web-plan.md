# Mini-Game: Connection Web — Implementation Plan

> Depends on: [mini-game-shared-infrastructure-plan.md](./mini-game-shared-infrastructure-plan.md)

## Game Description

Two columns of nodes: terms on the left, definitions/counterparts on the right. The player taps a left node to select it, then taps a right node to draw a connection. Lines link matched pairs. After all left nodes are connected, Submit evaluates correctness (≥80% correct connections → rating 3, else rating 1). Feedback colors each line green or red. Optional distractor nodes on either side have no correct match.

**Learning value:** Association and relational mapping — connecting related concepts requires understanding of relationships, definitions, and correspondences. Stronger active recall than multiple-choice because the player must identify the relationship, not just recognize it.

---

## 1. Data Schema

### `ConnectionWebContent` (in `src/types/core.ts`)

```typescript
export interface ConnectionWebContent {
  gameType: 'CONNECTION_WEB';
  prompt: string;
  pairs: { id: string; left: string; right: string }[];
  distractors?: { side: 'left' | 'right'; label: string; id: string }[];
  explanation: string;
}
```

**Constraints:**
- 4–7 pairs
- 0–2 distractors per side (optional)
- Distractor `id` values must not collide with pair `id` values
- Labels ≤ 8 words for mobile readability
- Right-side labels are shuffled at render time (not in correct order)

### Subject Examples

| Subject | Prompt | Pairs (sample) |
|---|---|---|
| Data Science | Match loss functions to use cases | MSE → Regression, Cross-Entropy → Classification, Hinge Loss → SVM, KL Divergence → Distribution Comparison |
| Physics | Match scientists to their laws | Newton → Laws of Motion, Faraday → Electromagnetic Induction, Boyle → Gas Pressure-Volume, Ohm → Voltage-Current |
| Robotics | Match actuator types to DOF | Servo → Rotational, Linear Actuator → Translational, Stepper Motor → Precise Rotation, Pneumatic Cylinder → Linear Force |

---

## 2. Zod Validation Schema

### `src/features/miniGameWeaver/miniGameContentSchema.ts` (ConnectionWeb section)

```typescript
const connectionWebPairSchema = z.object({
  id: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
});

const connectionWebDistractorSchema = z.object({
  id: z.string().min(1),
  side: z.enum(['left', 'right']),
  label: z.string().min(1),
});

export const connectionWebContentSchema = z.object({
  gameType: z.literal('CONNECTION_WEB'),
  prompt: z.string().min(1),
  pairs: z.array(connectionWebPairSchema).min(4).max(7),
  distractors: z.array(connectionWebDistractorSchema).max(4).optional(),
  explanation: z.string().min(1),
}).refine(
  (data) => {
    const pairIds = new Set(data.pairs.map(p => p.id));
    const distractorIds = (data.distractors ?? []).map(d => d.id);
    return distractorIds.every(id => !pairIds.has(id));
  },
  { message: 'Distractor ids must not collide with pair ids' }
).refine(
  (data) => {
    const ids = [
      ...data.pairs.map(p => p.id),
      ...(data.distractors ?? []).map(d => d.id),
    ];
    return new Set(ids).size === ids.length;
  },
  { message: 'All ids must be unique' }
);
```

---

## 3. Evaluation Logic

### `src/features/content/evaluateMiniGame.ts` (ConnectionWeb section)

The placements map uses `leftNodeId → rightNodeId`.

Left nodes include pair left-side entries and any left-side distractors. Right nodes include pair right-side entries and any right-side distractors. Distractors should remain unconnected — connecting to a distractor is always incorrect.

```typescript
function evaluateConnectionWeb(
  content: ConnectionWebContent,
  placements: Map<string, string>,  // leftNodeId → rightNodeId
): MiniGameResult {
  const totalPairs = content.pairs.length;
  let correctItems = 0;
  const placementList: MiniGamePlacement[] = [];

  // Build lookup: pairId → expected rightNodeId
  // Left nodes are identified by pair.id, right nodes by a derived id (e.g., "right-{pair.id}")
  const expectedRight = new Map<string, string>();
  for (const pair of content.pairs) {
    expectedRight.set(pair.id, `right-${pair.id}`);
  }

  for (const pair of content.pairs) {
    const leftId = pair.id;
    const expectedRightId = `right-${pair.id}`;
    const placedRightId = placements.get(leftId);
    const isItemCorrect = placedRightId === expectedRightId;
    if (isItemCorrect) correctItems++;
    placementList.push({ itemId: leftId, targetId: placedRightId ?? '' });
  }

  // Penalize connections from distractor left nodes (they should be unconnected)
  const leftDistractors = (content.distractors ?? []).filter(d => d.side === 'left');
  const totalItems = totalPairs + leftDistractors.length;
  let distractorCorrect = 0;
  for (const distractor of leftDistractors) {
    const connected = placements.has(distractor.id);
    if (!connected) distractorCorrect++;
    placementList.push({ itemId: distractor.id, targetId: placements.get(distractor.id) ?? '' });
  }

  const totalCorrect = correctItems + distractorCorrect;
  const score = totalItems > 0 ? totalCorrect / totalItems : 0;

  return {
    totalItems,
    correctItems: totalCorrect,
    score,
    isCorrect: score >= 0.8,
    placements: placementList,
  };
}
```

**Node ID convention:**
- Left pair nodes: `pair.id` (e.g., `"pair-1"`)
- Right pair nodes: `"right-{pair.id}"` (e.g., `"right-pair-1"`)
- Left distractors: `distractor.id`
- Right distractors: `distractor.id`

This convention is established at render time and used consistently in the interaction hook and evaluation.

---

## 4. React + motion component (hybrid: HTML nodes + SVG connectors)

### `src/components/miniGames/ConnectionWebGame.tsx`

Align with [mini-game-shared-infrastructure-plan.md](./mini-game-shared-infrastructure-plan.md): **nodes use shared `MiniGameItemChip`** (and the same state/animation vocabulary as Category Sort / Sequence Build). **D3 is not used.**

**Layout (mobile-first, portrait-friendly):**

```
┌──────────────────────────────┐
│                              │
│  [Term A]      [Def 3]      │  ← left column    right column
│                              │     (shuffled)
│  [Term B] ———— [Def 1]      │  ← connector drawn in SVG overlay
│                              │
│  [Term C]      [Def 2]      │
│                              │
│  [Term D]      [Def 4]      │
│                              │
│  [Dist L]      [Dist R]     │  ← distractors (if any)
│                              │
└──────────────────────────────┘
```

**Props:**

```typescript
interface ConnectionWebGameProps {
  content: ConnectionWebContent;
  interaction: ReturnType<typeof useMiniGameInteraction>;
}
```

No required `width` / `height` / `svgRef` props: the game measures connector endpoints with **refs + `getBoundingClientRect`** (or a resize observer on a wrapper) relative to a positioned parent; dimensions are internal.

**Rendering approach:**

1. **Wrapper** — `relative` container; optional `LayoutGroup` from `motion/react` if node layout animation is desired.

2. **Left column** — Pair left-labels + left distractors as **`MiniGameItemChip`** (from `miniGames/shared/`). Vertical stack (flex). Tap → `interaction.selectItem(leftNodeId)`.

3. **Right column** — Pair right-labels + right distractors, **shuffled** at mount (deterministic seed from content ids + prompt, same idea as Sequence Build pool). Same chip component. When a left node is selected, tap right → `interaction.placeItem(rightNodeId)`.

4. **Connection lines (SVG only)** — A **`MiniGameConnectorLayer`** (or inline SVG) **absolutely positioned** over the game area, behind or above chips per z-index. For each `interaction.placements` entry, draw a `<line>` (or quadratic path) from the **right edge** of the left chip to the **left edge** of the matched right chip, using measured coordinates. Default stroke: muted foreground; `stroke-width: 2`. Optional **motion** or CSS on `stroke-dashoffset` for draw-in after connect.

5. **Selected state** — Selected left chip: ring via shared chip styles. Valid right targets: persistent border/label cue (not hover-only).

6. **Removing connections** — Tapping a connected left node → `interaction.removeItem(leftNodeId)`; line list updates reactively.

7. **Post-submission feedback** — Lines and/or endpoint chips use green/red from shared “correct” / “incorrect” states. Left distractors left unconnected: correct; wrongly connected: incorrect (per evaluation).

**Why hybrid:** HTML chips reuse **one styling system** with other mini-games; SVG handles only the **polyline geometry** between columns without pulling D3 into the render path.

---

## 5. Interaction Adaptation

The `useMiniGameInteraction` hook's general tap-to-select / tap-to-place model maps cleanly:

- **selectItem** = tap a left-column node
- **placeItem** = tap a right-column node (creates connection)
- **removeItem** = tap a connected left node (removes connection)

One adaptation: in Connection Web, "placing" means creating a link, not moving an item into a zone. The semantics are identical from the hook's perspective (itemId → targetId mapping), but the visual representation differs.

**Distractor handling:** Left distractors appear in the left column and can be selected. If the player connects them to a right node, it counts as incorrect. The player can also leave them unconnected (correct behavior). The hook doesn't need special logic — distractors are just items with no correct target.

**Completion rule:** The game is "complete" (can submit) when all non-distractor left nodes have a connection. Left distractors may or may not be connected. This requires a small config addition to `useMiniGameInteraction`:

```typescript
useMiniGameInteraction({
  itemIds: [...pairLeftIds, ...leftDistractorIds],
  requiredItemIds: pairLeftIds,  // only these must be placed to enable Submit
  evaluateFn: (placements) => evaluateConnectionWeb(content, placements),
});
```

Add `requiredItemIds` as an optional parameter to the shared hook. When provided, `canSubmit` checks that all required items are placed (ignoring optional distractor items). Default behavior (no `requiredItemIds`) requires all items placed.

---

## 6. Tests

### Unit: `src/features/content/evaluateMiniGame.test.ts`

```
Connection Web evaluation
  ✓ returns score 1.0 when all pairs correctly matched and distractors unconnected
  ✓ returns score 0.0 when all pairs incorrectly matched
  ✓ returns isCorrect=true at threshold (e.g. 4/5 pairs correct, no distractors)
  ✓ returns isCorrect=false below threshold
  ✓ penalizes connected left distractors (counts as incorrect)
  ✓ rewards unconnected left distractors (counts as correct)
  ✓ handles content with no distractors
  ✓ handles content with distractors on both sides
```

### Component: `src/components/miniGames/ConnectionWebGame.test.tsx`

```
ConnectionWebGame
  ✓ renders correct number of left and right nodes
  ✓ right column is shuffled (not in pair order)
  ✓ selecting left node then tapping right node draws connection line
  ✓ tapping connected left node removes connection
  ✓ shows green/red lines after submission
  ✓ distractors render in their respective columns
```

---

## 7. New / modified files

| Path | Purpose |
|---|---|
| `src/components/miniGames/shared/MiniGameItemChip.tsx` | Shared chip (if not already extracted for other games) |
| `src/components/miniGames/shared/MiniGameConnectorLayer.tsx` | SVG overlay for connection lines |
| `src/components/miniGames/ConnectionWebGame.tsx` | Two-column layout + chip wiring + connector layer (~180–220 lines) |
| `src/components/miniGames/ConnectionWebGame.test.tsx` | Component tests |

## 8. Modified files

| Path | Change |
|---|---|
| `src/types/core.ts` | Add `ConnectionWebContent` interface |
| `src/features/content/evaluateMiniGame.ts` | Add `evaluateConnectionWeb` function |
| `src/features/miniGameWeaver/miniGameContentSchema.ts` | Add `connectionWebContentSchema` |
| `src/components/miniGames/MiniGameView.tsx` | Add `CONNECTION_WEB` case |
| `src/hooks/useMiniGameInteraction.ts` | Add optional `requiredItemIds` parameter for distractor support |
| `src/components/miniGames/CategorySortGame.tsx` | Refactor to `miniGames/shared` chips/zones (same effort as shared extraction) |
| `src/components/miniGames/SequenceBuildGame.tsx` | Refactor to `miniGames/shared` chips (same effort) |
