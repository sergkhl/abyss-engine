'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Check,
  Circle,
  History,
  Landmark,
  Minus,
  Network,
  Sparkles,
  Zap,
} from 'lucide-react';

import type { CardType } from '@/types/core';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useProgressionStore } from '@/features/progression';
import { uiStore, useUIStore } from '@/store/uiStore';

const DEV_XP_BUFF_ID = 'dev_xp_multiplier_5x' as const;
const DEV_BUFF_SOURCE = 'command_palette' as const;
const DEV_XP_AMOUNT = 80;

const CARD_TYPE_FILTER_STORAGE_KEY = 'abyss.commandPalette.cardTypeFilter';

const CARD_TYPES_ORDER: readonly CardType[] = [
  'FLASHCARD',
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
  'MINI_GAME',
] as const;

const CARD_TYPE_LABELS: Record<CardType, string> = {
  FLASHCARD: 'Flashcards',
  SINGLE_CHOICE: 'Single choice',
  MULTI_CHOICE: 'Multiple choice',
  MINI_GAME: 'Mini games',
};

function createDefaultCardTypeFilter(): Record<CardType, boolean> {
  return {
    FLASHCARD: true,
    SINGLE_CHOICE: true,
    MULTI_CHOICE: true,
    MINI_GAME: true,
  };
}

function loadCardTypeFilterFromStorage(): Record<CardType, boolean> {
  const fallback = createDefaultCardTypeFilter();
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(CARD_TYPE_FILTER_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<Record<CardType, boolean>>;
    const next = { ...fallback };
    for (const t of CARD_TYPES_ORDER) {
      if (typeof parsed[t] === 'boolean') {
        next[t] = parsed[t];
      }
    }
    return next;
  } catch {
    return fallback;
  }
}

function saveCardTypeFilterToStorage(filter: Record<CardType, boolean>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CARD_TYPE_FILTER_STORAGE_KEY, JSON.stringify(filter));
  } catch {
    // ignore quota / private mode
  }
}

export interface AbyssCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDebugMode: boolean;
  /** When set, shows “Summarize screen” which runs screen capture then vision LLM. */
  onSummarizeScreen?: () => void;
  /** Opens AscentWeaver to generate a curriculum graph into IndexedDB. */
  onOpenAscentWeaver?: () => void;
  /** Starts a study session for the selected topic using only enabled card types. */
  onStartStudyWithCardTypes?: (enabledTypes: CardType[]) => void;
}

function matchesDevXpBuff(b: { buffId: string; source?: string }) {
  return b.buffId === DEV_XP_BUFF_ID && (b.source ?? 'legacy') === DEV_BUFF_SOURCE;
}

export function AbyssCommandPalette({
  open,
  onOpenChange,
  isDebugMode,
  onSummarizeScreen,
  onOpenAscentWeaver,
  onStartStudyWithCardTypes,
}: AbyssCommandPaletteProps) {
  const selectedTopicId = useUIStore((s) => s.selectedTopicId);
  const devXpBuffActive = useProgressionStore((s) => s.activeBuffs.some(matchesDevXpBuff));
  const [cardTypeFilter, setCardTypeFilter] = useState(createDefaultCardTypeFilter);
  const skipNextCardFilterSaveRef = useRef(true);

  useEffect(() => {
    setCardTypeFilter(loadCardTypeFilterFromStorage());
  }, []);

  useEffect(() => {
    if (skipNextCardFilterSaveRef.current) {
      skipNextCardFilterSaveRef.current = false;
      return;
    }
    saveCardTypeFilterToStorage(cardTypeFilter);
  }, [cardTypeFilter]);

  const enabledTypesList = useMemo(
    () => CARD_TYPES_ORDER.filter((t) => cardTypeFilter[t]),
    [cardTypeFilter],
  );

  const canStartFilteredStudy =
    Boolean(selectedTopicId) && enabledTypesList.length > 0 && Boolean(onStartStudyWithCardTypes);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
        return;
      }
      if (open) {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      event.preventDefault();
      onOpenChange(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const handleOpenTimeline = () => {
    uiStore.getState().openStudyTimeline();
    onOpenChange(false);
  };

  const handleOpenDiscovery = () => {
    uiStore.getState().openDiscoveryModal();
    onOpenChange(false);
  };

  const handleDevAddXp = () => {
    const topicId = uiStore.getState().selectedTopicId;
    if (!topicId) {
      return;
    }
    const progression = useProgressionStore.getState();
    const nextXp = progression.addXP(topicId, DEV_XP_AMOUNT, { sessionId: 'dev-command-palette' });
    if (nextXp <= 0) {
      return;
    }
    progression.emitEvent('xp-gained', {
      amount: DEV_XP_AMOUNT,
      rating: 3,
      sessionId: 'dev-command-palette',
      topicId,
    });
    onOpenChange(false);
  };

  const handleDevSubtractXp = () => {
    const topicId = uiStore.getState().selectedTopicId;
    if (!topicId) {
      return;
    }
    const progression = useProgressionStore.getState();
    const crystal = progression.activeCrystals.find((c) => c.topicId === topicId);
    if (!crystal) {
      return;
    }
    progression.addXP(topicId, -DEV_XP_AMOUNT);
    progression.emitEvent('xp-gained', {
      amount: -DEV_XP_AMOUNT,
      rating: 3,
      sessionId: 'dev-command-palette',
      topicId,
    });
    onOpenChange(false);
  };

  const handleDevXpBuffToggle = () => {
    useProgressionStore.getState().toggleBuffFromCatalog(DEV_XP_BUFF_ID, DEV_BUFF_SOURCE);
    onOpenChange(false);
  };

  const canDevAddXp = Boolean(selectedTopicId);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <Command className="rounded-lg! border-none! bg-transparent! shadow-none!">
        <CommandInput placeholder="Search commands…" />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup heading="Study">
            <CommandItem value="timeline study history" onSelect={handleOpenTimeline}>
              <History className="size-4" />
              <span>Open study timeline</span>
            </CommandItem>
            <CommandItem value="discovery wisdom altar" onSelect={handleOpenDiscovery}>
              <Landmark className="size-4" />
              <span>Open Wisdom Altar (Discovery)</span>
            </CommandItem>
          </CommandGroup>
          {onStartStudyWithCardTypes ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Card type filter">
                <CommandItem
                  value="study filtered cards selected topic crystal flashcard choice mini game"
                  disabled={!canStartFilteredStudy}
                  onSelect={() => {
                    if (!canStartFilteredStudy) {
                      return;
                    }
                    onStartStudyWithCardTypes(enabledTypesList);
                    onOpenChange(false);
                  }}
                >
                  <BookOpen className="size-4" />
                  <span>Study filtered cards (selected topic)</span>
                </CommandItem>
                {CARD_TYPES_ORDER.map((type) => {
                  const on = cardTypeFilter[type];
                  const label = CARD_TYPE_LABELS[type];
                  const searchExtras =
                    type === 'FLASHCARD'
                      ? 'flashcard deck'
                      : type === 'SINGLE_CHOICE'
                        ? 'single choice mcq'
                        : type === 'MULTI_CHOICE'
                          ? 'multiple choice mcq'
                          : 'mini game category sort';
                  return (
                    <CommandItem
                      key={type}
                      value={`filter include ${label} ${type} ${searchExtras} study filter toggle`}
                      onSelect={() => {
                        setCardTypeFilter((prev) => ({ ...prev, [type]: !prev[type] }));
                      }}
                    >
                      {on ? (
                        <Check className="size-4 text-primary" aria-hidden />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" aria-hidden />
                      )}
                      <span>
                        Include {label}
                        <span className="sr-only">{on ? ', on' : ', off'}</span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}
          {onSummarizeScreen ? (
            <CommandGroup heading="Assistant">
              <CommandItem
                value="screen capture summarize screenshot assistant vision"
                onSelect={() => {
                  onSummarizeScreen();
                  onOpenChange(false);
                }}
              >
                <Camera className="size-4" />
                <span>Summarize screen with assistant</span>
              </CommandItem>
            </CommandGroup>
          ) : null}
          {onOpenAscentWeaver ? (
            <CommandGroup heading="Curriculum">
              <CommandItem
                value="ascent weaver curriculum graph generate subject indexeddb"
                onSelect={() => {
                  onOpenAscentWeaver();
                  onOpenChange(false);
                }}
              >
                <Network className="size-4" />
                <span>Open AscentWeaver (curriculum graph)</span>
              </CommandItem>
            </CommandGroup>
          ) : null}
          {isDebugMode ? (
            <CommandGroup heading="Dev">
              <CommandItem
                value="add xp crystal dev"
                disabled={!canDevAddXp}
                onSelect={() => {
                  if (!canDevAddXp) {
                    return;
                  }
                  handleDevAddXp();
                }}
              >
                <Sparkles className="size-4" />
                <span>Add +80 XP to selected crystal</span>
              </CommandItem>
              <CommandItem
                value="subtract xp crystal dev"
                disabled={!canDevAddXp}
                onSelect={() => {
                  if (!canDevAddXp) {
                    return;
                  }
                  handleDevSubtractXp();
                }}
              >
                <Minus className="size-4" />
                <span>Subtract 80 XP from selected crystal</span>
              </CommandItem>
              <CommandItem value="toggle xp multiplier buff dev" onSelect={handleDevXpBuffToggle}>
                <Zap className="size-4" />
                <span>
                  {devXpBuffActive ? 'Turn off 5× XP multiplier (dev)' : 'Turn on 5× XP multiplier (dev)'}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
