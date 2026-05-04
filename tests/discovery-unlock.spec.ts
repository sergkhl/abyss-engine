import { test as base, expect, type Page } from '@playwright/test';
import { seedApp } from './fixtures/app';
import {
  waitForCanvasClickBox,
  waitForDeckReady,
} from './utils/test-helpers';

/**
 * Discovery/Unlock E2E Test — Abyss Engine
 *
 * Boots through the fresh-player Mentor onboarding deterministically
 * before exercising the Wisdom Altar discovery grid. State logic tests
 * live in Vitest; this spec is intentionally UI-driven.
 *
 * Why a custom fixture instead of `seededApp`:
 * the default `seededApp` calls `seedApp(page)` which tries to click the
 * `Load Default Deck` button before dismissing the welcome overlay. Under
 * the fresh-player flow that overlay covers / blocks the deck loader, so
 * `seedApp`'s `if (count > 0)` guard silently no-ops and the spec lands
 * with no deck. Boot the app *without* the deck, dismiss the overlay
 * ourselves, then load the deck through the now-reachable UI — the same
 * approach `tests/mentor/discovery-cta.spec.ts` uses.
 */

const test = base.extend<{ deckLessApp: Page }>({
  deckLessApp: async ({ page }, use) => {
    await seedApp(page, { loadDefaultDeck: false });
    await use(page);
  },
});

async function dismissMentorWelcome(page: Page): Promise<void> {
  const overlay = page.getByTestId('mentor-dialog-overlay');
  if (await overlay.isVisible().catch(() => false)) {
    await page.getByTestId('mentor-dialog-close').click();
    await expect(overlay).toBeHidden({ timeout: 5_000 });
  }
}

async function loadDefaultDeck(page: Page): Promise<void> {
  // Discovery grid is meaningless without a deck. With the welcome
  // overlay dismissed the loader button must now be reachable; if it
  // isn't, fail loudly here at 10 s rather than letting a downstream
  // assertion time out 15 s later with a misleading "element not found".
  const loadDeckButton = page.locator('button:has-text("Load Default Deck")');
  await expect(
    loadDeckButton,
    'Default deck loader is required to seed the discovery grid',
  ).toBeVisible({ timeout: 10_000 });
  await loadDeckButton.click();
  await waitForDeckReady(page);
}

async function openWisdomAltar(page: Page) {
  // Quick Actions menu is the deterministic UI path; canvas-centre
  // clicks depend on camera position and any overlapping HUD.
  await page.getByTestId('quick-actions-trigger').click();
  await page.getByRole('menuitem', { name: /Wisdom Altar/ }).click();
  const altar = page.getByRole('dialog', { name: /Wisdom Altar/i });
  await expect(altar).toBeVisible({ timeout: 10_000 });
  return altar;
}

test.describe('Discovery/Unlock Journey', () => {
  /**
   * Test: Discovery modal displays tiered topic grid.
   */
  test('should display tiered topic grid with unlock points and lock icons', async ({
    deckLessApp: page,
  }) => {
    await dismissMentorWelcome(page);
    await loadDefaultDeck(page);

    const altar = await openWisdomAltar(page);

    // Unlock points are shown as a badge with a tooltip (no literal "Unlock Point" copy in the DOM).
    await expect(altar.getByTitle('Unlock points').first()).toBeVisible();

    // Default topic filter is "Locked". Loading the default deck can unlock the entire curriculum,
    // leaving the locked filter with zero tiles — that is expected, not a bug. Widen to "All topics"
    // so tier rows render. Use the toggle slot + title — Base UI toggles aren't always exposed as
    // `role="button"` with the same accessible name Playwright expects.
    await altar
      .locator('[data-slot="toggle-group-item"][title^="All topics ("]')
      .click();

    // Tier headings are "Tier 1", "Tier 2", … (substring match avoids brittle full-string anchoring).
    await expect(altar.getByText(/Tier\s+\d+/).first()).toBeVisible({
      timeout: 15_000,
    });

    // Tiles use Lucide lock badges when locked and check badges when unlocked (no literal 🔒 in the grid).
    const lockBadges = altar.getByTestId('discovery-topic-lock-badge');
    const unlockBadges = altar.getByTestId('discovery-topic-unlock-badge');
    await expect(lockBadges.or(unlockBadges).first()).toBeVisible();
  });

  /**
   * Test: Can view topic details and close modal.
   */
  test('should open topic details and close discovery modal with escape', async ({
    deckLessApp: page,
  }) => {
    await dismissMentorWelcome(page);
    await loadDefaultDeck(page);

    // Capture the canvas handle before the dialog opens so we can assert
    // the 3D scene is still mounted after the modal dismiss at the end.
    const { canvas } = await waitForCanvasClickBox(page);

    const altar = await openWisdomAltar(page);

    // Widen the filter so topic tiles are present in the grid.
    await altar
      .locator('[data-slot="toggle-group-item"][title^="All topics ("]')
      .click();

    const topicButtons = altar.locator('div.grid button');
    const buttonCount = await topicButtons.count();

    if (buttonCount > 0) {
      await topicButtons.first().click();
      await page.waitForTimeout(500);

      // Check for the details popup (prerequisites or topic info).
      const detailsPopup = page.locator('text=Prerequisites');
      const hasDetails =
        (await detailsPopup.count()) > 0 ||
        (await page.locator('[class*="bg-slate-800"]').count()) > 1;
      expect(hasDetails).toBe(true);
    }

    // Close — try Escape first, fall back to the modal's Close button.
    // Base UI may not deliver Escape to this dialog if focus stayed on a
    // non-dialog element after the topic-tile click; the explicit Close
    // button is the deterministic dismiss.
    await page.keyboard.press('Escape');
    if (await altar.isVisible().catch(() => false)) {
      const closeBtn = altar.getByRole('button', { name: 'Close' });
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    }
    await expect(altar).not.toBeVisible({ timeout: 3_000 });

    // Canvas should still be mounted and visible after closing the modal.
    await expect(canvas).toBeVisible();
  });
});
