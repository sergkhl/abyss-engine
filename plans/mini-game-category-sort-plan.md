# Mini-Game: Category Sort — Implementation Plan

> Depends on: [mini-game-shared-infrastructure-plan.md](./mini-game-shared-infrastructure-plan.md)

## Game Description

Items float in a pool at the bottom of the SVG. Category zones sit at the top. The player taps an item to select it, then taps a category zone to place it. After all items are placed, a Submit button evaluates correctness (≥80% correct → rating 3, else rating 1). Feedback highlights correct/incorrect placements, then Continue advances the session.

**Learning value:** Classification and taxonomy — sorting concepts into categories requires understanding of defining characteristics and boundary cases. Universally applicable across subjects.

---

## 1. Data Schema

### `CategorySortContent` (in `src/types/core.ts`)

```typescript
export interface CategorySortContent {
  gameType: 'CATEGORY_SORT';
  prompt: string;
  categories: { id: string; label: string }[];
  items: { id: string; label: string; categoryId: string }[];
  explanation: string;
}
```

**Constraints:**
- 2–4 categories
- 6–10 items
- Every `item.categoryId` must reference a valid `category.id`
- Items should be distributed across categories (no empty categories)
- Labels ≤ 8 words for mobile readability

### Subject Examples

| Subject | Prompt | Categories | Items (sample) |
|---|---|---|---|
| Data Science | Sort these ML algorithms | Supervised, Unsupervised, Reinforcement | Linear Regression → Supervised, K-Means → Unsupervised, Q-Learning → Reinforcement |
| Physics | Classify these quantities | Scalar, Vector | Speed → Scalar, Velocity → Vector, Temperature → Scalar, Force → Vector |
| Robotics | Sort sensors by type | Proprioceptive, Exteroceptive | IMU → Proprioceptive, LiDAR → Exteroceptive, Encoder → Proprioceptive |

---

## 2. Zod Validation Schema

### `src/features/miniGameWeaver/miniGameContentSchema.ts` (CategorySort section)

```typescript
const categorySortItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  categoryId: z.string().min(1),
});

const categorySortCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const categorySortContentSchema = z.object({
  gameType: z.literal('CATEGORY_SORT'),
  prompt: z.string().min(1),
  categories: z.array(categorySortCategorySchema).min(2).max(4),
  items: z.array(categorySortItemSchema).min(6).max(10),
  explanation: z.string().min(1),
}).refine(
  (data) => {
    const categoryIds = new Set(data.categories.map(c => c.id));
    return data.items.every(item => categoryIds.has(item.categoryId));
  },
  { message: 'Every item.categoryId must reference a valid category.id' }
).refine(
  (data) => {
    const usedCategories = new Set(data.items.map(i => i.categoryId));
    return data.categories.every(c => usedCategories.has(c.id));
  },
  { message: 'Every category must have at least one item' }
);
```

---

## 3. Evaluation Logic

### `src/features/content/evaluateMiniGame.ts` (CategorySort section)

```typescript
function evaluateCategorySort(
  content: CategorySortContent,
  placements: Map<string, string>,  // itemId → categoryId
): MiniGameResult {
  const totalItems = content.items.length;
  let correctItems = 0;
  const placementList: MiniGamePlacement[] = [];

  for (const item of content.items) {
    const placedCategoryId = placements.get(item.id);
    const isItemCorrect = placedCategoryId === item.categoryId;
    if (isItemCorrect) correctItems++;
    placementList.push({ itemId: item.id, targetId: placedCategoryId ?? '' });
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

### `src/components/miniGames/CategorySortGame.tsx`

**SVG Layout (portrait mobile, ~320×400):**

```
┌──────────────────────────────┐
│  [Category A]  [Category B]  │  ← zone row (top)
│  ┌──────────┐  ┌──────────┐ │
│  │ placed   │  │ placed   │ │
│  │ items    │  │ items    │ │
│  └──────────┘  └──────────┘ │
│                              │
│  [Category C]  [Category D]  │  ← zone row (if 3-4 categories)
│  ┌──────────┐  ┌──────────┐ │
│  │          │  │          │ │
│  └──────────┘  └──────────┘ │
│                              │
│──────────────────────────────│
│  [item] [item] [item] [item] │  ← unplaced item pool (bottom)
│  [item] [item]               │
└──────────────────────────────┘
```

**Props:**

```typescript
interface CategorySortGameProps {
  content: CategorySortContent;
  interaction: ReturnType<typeof useMiniGameInteraction>;
  width: number;
  height: number;
  svgRef: RefObject<SVGSVGElement>;
}
```

**Rendering approach:**

1. **Category zones** — Rendered as dashed-border `<rect>` groups at the top. 2 categories per row. Each zone has a header label and a vertical stack area for placed items. Tap handler calls `interaction.placeItem(categoryId)` when an item is selected.

2. **Unplaced item pool** — Items rendered as filled rounded `<rect>` + `<text>` at the bottom. Wrapped in rows (3-4 per row based on width). Tap handler calls `interaction.selectItem(itemId)`.

3. **Placed items** — When an item is placed, it moves (D3 transition, ~200ms) from the pool to inside its category zone. Tap handler calls `interaction.removeItem(itemId)` to return it.

4. **Selected state** — Selected item gets a ring highlight (`stroke` + `stroke-width` change).

5. **Post-submission feedback** — Correct items get green fill. Incorrect items get red fill + a brief shake animation (D3 transition on `transform`). Items stay in their zones so the player can see what was wrong.

**D3 usage:**
- `d3-selection` for SVG element joins (enter/update/exit for items moving between pool and zones)
- `d3-transition` for animated movement and feedback
- No `d3-force` needed (grid layout, not physics-based)

---

## 5. Integration in MiniGameView

```typescript
// In MiniGameView.tsx
case 'CATEGORY_SORT':
  return (
    <CategorySortGame
      content={renderedCard.miniGame as CategorySortContent}
      interaction={interaction}
      width={width}
      height={height}
      svgRef={svgRef}
    />
  );
```

---

## 6. Tests

### Unit: `src/features/content/evaluateMiniGame.test.ts`

```
Category Sort evaluation
  ✓ returns score 1.0 when all items correctly categorized
  ✓ returns score 0.0 when all items incorrectly categorized
  ✓ returns isCorrect=true when score >= 0.8 (e.g. 8/10 correct)
  ✓ returns isCorrect=false when score < 0.8 (e.g. 7/10 correct)
  ✓ handles missing placements (unplaced items count as incorrect)
  ✓ handles empty items array (score 0, isCorrect false)
```

### Component: `src/components/miniGames/CategorySortGame.test.tsx`

```
CategorySortGame
  ✓ renders correct number of category zones
  ✓ renders correct number of items in pool
  ✓ item moves to zone when selected then zone tapped
  ✓ placed item returns to pool when tapped
  ✓ shows green/red feedback after submission
```

---

## 7. New Files

| Path | Purpose |
|---|---|
| `src/components/miniGames/CategorySortGame.tsx` | D3 SVG renderer (~150 lines) |
| `src/components/miniGames/CategorySortGame.test.tsx` | Component tests |

## 8. Modified Files

| Path | Change |
|---|---|
| `src/types/core.ts` | Add `CategorySortContent` interface |
| `src/features/content/evaluateMiniGame.ts` | Add `evaluateCategorySort` function |
| `src/features/miniGameWeaver/miniGameContentSchema.ts` | Add `categorySortContentSchema` |
| `src/components/miniGames/MiniGameView.tsx` | Add `CATEGORY_SORT` case |
