'use client';

import * as React from 'react';

export type ModalBodyScrollLockContextValue = {
  modal: boolean;
  lockScroll: boolean;
  /** For custom overlay `data-state` when `modal={false}` + `lockScroll`. Prefer controlled `open` on the dialog root. */
  dialogOpen: boolean;
  /** Which root mounted the scroll barrier; nested sheets reuse dialog barrier and only register shards. */
  barrierSource: 'dialog' | 'sheet';
  shardRefs: React.RefObject<HTMLElement | null>[];
  registerShard: (ref: React.RefObject<HTMLElement | null>) => () => void;
};

const ModalBodyScrollLockContext = React.createContext<ModalBodyScrollLockContextValue | null>(null);

export function ModalBodyScrollLockProvider({
  children,
  modal,
  lockScroll,
  dialogOpen,
  barrierSource,
}: {
  children: React.ReactNode;
  modal: boolean;
  lockScroll: boolean;
  dialogOpen: boolean;
  barrierSource: 'dialog' | 'sheet';
}) {
  const [shardRefs, setShardRefs] = React.useState<React.RefObject<HTMLElement | null>[]>([]);

  const registerShard = React.useCallback((ref: React.RefObject<HTMLElement | null>) => {
    setShardRefs((prev) => [...prev, ref]);
    return () => {
      setShardRefs((prev) => prev.filter((r) => r !== ref));
    };
  }, []);

  const value = React.useMemo(
    () => ({
      modal,
      lockScroll,
      dialogOpen,
      barrierSource,
      shardRefs,
      registerShard,
    }),
    [modal, lockScroll, dialogOpen, barrierSource, shardRefs, registerShard],
  );

  return (
    <ModalBodyScrollLockContext.Provider value={value}>{children}</ModalBodyScrollLockContext.Provider>
  );
}

export function useModalBodyScrollLockContext() {
  return React.useContext(ModalBodyScrollLockContext);
}

/**
 * Registers a portaled surface (e.g. nested LLM dialog) as an allowed scroll shard for the nearest Abyss dialog/sheet lock.
 */
export function useRegisterModalBodyScrollShard(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const registerShard = useModalBodyScrollLockContext()?.registerShard;

  // Depend on `registerShard` only — the full context value changes whenever `shardRefs`
  // updates; listing that object in deps would re-run this effect after every register and loop.
  React.useEffect(() => {
    if (!registerShard || !enabled) return;
    return registerShard(ref);
  }, [registerShard, enabled, ref]);
}
